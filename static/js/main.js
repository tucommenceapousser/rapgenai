document.addEventListener('DOMContentLoaded', function() {
    const lyricForm = document.getElementById('lyricForm');
    const lyricsOutput = document.getElementById('lyricsOutput');
    const copyLyricsBtn = document.getElementById('copyLyrics');
    const saveLyricsBtn = document.getElementById('saveLyrics');
    const exportLyricsBtn = document.getElementById('exportLyrics');
    const trackSelector = document.getElementById('trackSelector');
    const audioPlayer = document.getElementById('audioPlayer');
    const saveTrackBtn = document.getElementById('saveTrack');

    if (lyricForm && lyricsOutput) {
        lyricForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const theme = document.getElementById('theme')?.value || '';
            const style = document.getElementById('style')?.value || '';
            const rhymeScheme = document.getElementById('rhymeScheme')?.value || '';
            const flow = document.getElementById('flow')?.value || '';

            fetch('/generate_lyrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `theme=${encodeURIComponent(theme)}&style=${encodeURIComponent(style)}&rhyme_scheme=${encodeURIComponent(rhymeScheme)}&flow=${encodeURIComponent(flow)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.lyrics) {
                    lyricsOutput.textContent = data.lyrics;
                } else {
                    lyricsOutput.textContent = 'Error generating lyrics. Please try again.';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                lyricsOutput.textContent = 'An error occurred. Please try again.';
            });
        });
    }

    if (copyLyricsBtn && lyricsOutput) {
        copyLyricsBtn.addEventListener('click', function() {
            const lyrics = lyricsOutput.textContent;
            navigator.clipboard.writeText(lyrics).then(() => {
                alert('Lyrics copied to clipboard!');
            }).catch(err => {
                console.error('Error copying text: ', err);
            });
        });
    }

    if (exportLyricsBtn && lyricsOutput) {
        exportLyricsBtn.addEventListener('click', function() {
            const lyrics = lyricsOutput.textContent;
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '/export_lyrics';
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'lyrics';
            input.value = lyrics;
            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        });
    }

    if (trackSelector && audioPlayer) {
        trackSelector.addEventListener('change', function() {
            const selectedTrack = this.value;
            if (selectedTrack) {
                audioPlayer.src = `/static/tracks/${selectedTrack}`;
                audioPlayer.load();
            }
        });
    }

    if (saveLyricsBtn && lyricsOutput) {
        saveLyricsBtn.addEventListener('click', function() {
            const lyrics = lyricsOutput.textContent;
            fetch('/save_favorite_lyrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `lyrics=${encodeURIComponent(lyrics)}`
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while saving the lyrics.');
            });
        });
    }

    if (saveTrackBtn && trackSelector) {
        saveTrackBtn.addEventListener('click', function() {
            const selectedTrack = trackSelector.value;
            if (selectedTrack) {
                fetch('/save_favorite_track', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `track_name=${encodeURIComponent(selectedTrack)}`
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while saving the track.');
                });
            } else {
                alert('Please select a track before saving.');
            }
        });
    }
});
