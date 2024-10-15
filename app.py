import os
import logging
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from openai import OpenAI
from models import db, User, FavoriteLyric, FavoriteTrack, SavedBeat
from werkzeug.security import generate_password_hash, check_password_hash
from io import BytesIO

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///rap_lyrics.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

logging.basicConfig(level=logging.ERROR)

openai_client = OpenAI()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    tracks = os.listdir('static/tracks')
    return render_template('index.html', tracks=tracks)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists')
            return redirect(url_for('register'))
        
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registration successful. Please log in.')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('index'))
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/generate_lyrics', methods=['POST'])
def generate_lyrics():
    theme = request.form['theme']
    style = request.form['style']
    rhyme_scheme = request.form['rhyme_scheme']
    flow = request.form['flow']
    
    prompt = f"""Générez des paroles de rap en français avec les caractéristiques suivantes :
    - Thème : '{theme}'
    - Style : '{style}'
    - Schéma de rimes : '{rhyme_scheme}'
    - Flow : '{flow}'

    Instructions spécifiques :
    1. Respectez strictement le schéma de rimes '{rhyme_scheme}'. Chaque lettre représente un son de rime différent.
    2. Adaptez le flow des paroles pour qu'il soit '{flow}'. 
       - Si 'drill', utilisez des phrases fluides, des punchlines hardcores et des transitions douces entre les lignes.
       - Si 'choppy', utilisez des phrases courtes et des pauses fréquentes.
       - Si 'fast', créez un rythme rapide avec des mots courts et des syllabes rapides.
       - Si 'slow', utilisez des mots plus longs et des phrases plus étendues.

    3. Assurez-vous que le style '{style}' est clairement reflété dans le choix des mots et les expressions utilisées.
    4. Intégrez le thème '{theme}' de manière créative et cohérente tout au long des paroles.

    Les paroles doivent être créatives, engageantes et suivre une structure de rap typique avec des couplets et un refrain.
    Assurez-vous que le schéma de rimes et le flow correspondent parfaitement aux options choisies."""
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Vous êtes un générateur de paroles de rap dans le style drill en français expert. Répondez uniquement en français."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            n=1,
            stop=None,
            temperature=0.8,
        )
        lyrics = response.choices[0].message.content
        return jsonify({"lyrics": lyrics})
    except Exception as e:
        logging.error(f"Error generating lyrics: {str(e)}")
        return jsonify({"error": "An error occurred while generating lyrics. Please try again."}), 500

@app.route('/save_favorite_lyrics', methods=['POST'])
@login_required
def save_favorite_lyrics():
    lyrics = request.form['lyrics']
    new_favorite = FavoriteLyric(content=lyrics, user_id=current_user.id)
    db.session.add(new_favorite)
    db.session.commit()
    return jsonify({"message": "Lyrics saved successfully"})

@app.route('/save_favorite_track', methods=['POST'])
@login_required
def save_favorite_track():
    track_name = request.form['track_name']
    new_favorite = FavoriteTrack(track_name=track_name, user_id=current_user.id)
    db.session.add(new_favorite)
    db.session.commit()
    return jsonify({"message": "Track saved successfully"})

@app.route('/favorites')
@login_required
def favorites():
    favorite_lyrics = current_user.favorite_lyrics.all()
    favorite_tracks = current_user.favorite_tracks.all()
    return render_template('favorites.html', favorite_lyrics=favorite_lyrics, favorite_tracks=favorite_tracks)

@app.route('/export_lyrics', methods=['POST'])
def export_lyrics():
    lyrics = request.form['lyrics']
    lyrics_file = BytesIO(lyrics.encode('utf-8'))
    return send_file(lyrics_file, as_attachment=True, download_name='rap_lyrics.txt', mimetype='text/plain')

@app.route('/beat_maker')
@login_required
def beat_maker():
    tracks = os.listdir('static/tracks')
    saved_beats = SavedBeat.query.filter_by(user_id=current_user.id).all()
    return render_template('beat_maker.html', tracks=tracks, saved_beats=saved_beats)

@app.route('/save_beat', methods=['POST'])
@login_required
def save_beat():
    beat_data = request.json
    new_beat = SavedBeat(
        name=beat_data['name'],
        bpm=beat_data['bpm'],
        background_track=beat_data['backgroundTrack'],
        tracks=str(beat_data['tracks']),
        user_id=current_user.id
    )
    db.session.add(new_beat)
    db.session.commit()
    return jsonify({"message": "Beat saved successfully"})

@app.route('/load_beat/<int:beat_id>')
@login_required
def load_beat(beat_id):
    beat = SavedBeat.query.get_or_404(beat_id)
    if beat.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403
    
    beat_data = {
        "name": beat.name,
        "bpm": beat.bpm,
        "background_track": beat.background_track,
        "tracks": eval(beat.tracks)
    }
    return jsonify(beat_data)

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
