document.addEventListener('DOMContentLoaded', function() {
    const addTrackBtn = document.getElementById('addTrack');
    const playPauseBtn = document.getElementById('playPause');
    const stopBtn = document.getElementById('stop');
    const bpmSlider = document.getElementById('bpm');
    const bpmValue = document.getElementById('bpmValue');
    const backgroundTrackSelect = document.getElementById('backgroundTrack');
    const saveBeatBtn = document.getElementById('saveBeat');
    const savedBeatsSelect = document.getElementById('savedBeats');
    const loadBeatBtn = document.getElementById('loadBeat');
    const saveStatus = document.getElementById('saveStatus');
    const tracksContainer = document.getElementById('tracks');

    // Check if we're on the beat maker page
    if (!tracksContainer) {
        console.log('Not on the beat maker page. Exiting initialization.');
        return;
    }

    console.log('Initializing beat maker...');

    let audioContext;
    let isPlaying = false;
    let currentStep = 0;
    let intervalId;
    let tracks = [];
    let backgroundAudio;

    function initializeBeatMaker() {
        addTrackBtn?.addEventListener('click', addTrack);
        playPauseBtn?.addEventListener('click', togglePlayPause);
        stopBtn?.addEventListener('click', stopSequencer);
        bpmSlider?.addEventListener('input', updateBPM);
        backgroundTrackSelect?.addEventListener('change', loadBackgroundTrack);
        saveBeatBtn?.addEventListener('click', saveBeat);
        loadBeatBtn?.addEventListener('click', loadBeat);

        // Load saved state from localStorage
        loadStateFromLocalStorage();

        // If no saved state, add default tracks
        if (tracks.length === 0) {
            addTrack();
            addTrack();
        }
    }

    function saveStateToLocalStorage() {
        const state = {
            tracks: tracks,
            bpm: bpmSlider ? parseInt(bpmSlider.value) : 120,
            backgroundTrack: backgroundTrackSelect ? backgroundTrackSelect.value : ''
        };
        localStorage.setItem('beatMakerState', JSON.stringify(state));
    }

    function loadStateFromLocalStorage() {
        const savedState = localStorage.getItem('beatMakerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            tracks = state.tracks;
            if (bpmSlider && bpmValue) {
                bpmSlider.value = state.bpm;
                bpmValue.textContent = state.bpm;
            }
            if (backgroundTrackSelect) {
                backgroundTrackSelect.value = state.backgroundTrack;
                loadBackgroundTrack();
            }
            restoreTracksFromState();
        }
    }

    function restoreTracksFromState() {
        tracksContainer.innerHTML = '';
        tracks.forEach((track, index) => {
            addTrack(false);
            updateTrackDisplay(index);
        });
    }

    function addTrack(shouldSaveState = true) {
        console.log('Adding new track...');
        const trackIndex = tracks.length;
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track mb-3';
        trackDiv.innerHTML = `
            <div class="d-flex align-items-center mb-2">
                <span class="me-2">Track ${trackIndex + 1}</span>
                <button class="btn btn-sm btn-danger remove-track">Remove</button>
            </div>
            <div class="steps">
                ${Array(16).fill().map((_, i) => `
                    <button class="btn btn-sm btn-outline-secondary step" data-step="${i}">
                        <span class="step-number">${i + 1}</span>
                    </button>
                `).join('')}
            </div>
        `;
        tracksContainer.appendChild(trackDiv);

        const removeBtn = trackDiv.querySelector('.remove-track');
        removeBtn.addEventListener('click', () => removeTrack(trackIndex));

        const stepButtons = trackDiv.querySelectorAll('.step');
        stepButtons.forEach(button => {
            button.addEventListener('click', () => toggleStep(trackIndex, parseInt(button.dataset.step)));
        });

        if (shouldSaveState) {
            tracks.push({ steps: Array(16).fill(false) });
            updateTrackNumbers();
            saveStateToLocalStorage();
        }
    }

    function removeTrack(index) {
        console.log('Removing track:', index);
        if (tracks.length > 1) {
            tracks.splice(index, 1);
            tracksContainer.removeChild(tracksContainer.children[index]);
            updateTrackNumbers();
            saveStateToLocalStorage();
        } else {
            console.log('Cannot remove the last track');
        }
    }

    function updateTrackNumbers() {
        console.log('Updating track numbers...');
        const trackDivs = tracksContainer.getElementsByClassName('track');
        Array.from(trackDivs).forEach((trackDiv, index) => {
            trackDiv.querySelector('span').textContent = `Track ${index + 1}`;
        });
    }

    function toggleStep(trackIndex, stepIndex) {
        console.log('Toggling step:', trackIndex, stepIndex);
        tracks[trackIndex].steps[stepIndex] = !tracks[trackIndex].steps[stepIndex];
        const trackDiv = tracksContainer.children[trackIndex];
        const stepButton = trackDiv.querySelectorAll('.step')[stepIndex];
        stepButton.classList.toggle('btn-primary');
        stepButton.classList.toggle('btn-outline-secondary');
        saveStateToLocalStorage();
    }

    function updateBPM() {
        console.log('Updating BPM...');
        if (bpmValue) bpmValue.textContent = bpmSlider.value;
        if (isPlaying) {
            stopSequencer();
            startSequencer();
        }
        saveStateToLocalStorage();
    }

    function togglePlayPause() {
        console.log('Toggling play/pause...');
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (isPlaying) {
            stopSequencer();
        } else {
            startSequencer();
        }
    }

    function startSequencer() {
        console.log('Starting sequencer...');
        isPlaying = true;
        currentStep = 0;
        if (playPauseBtn) playPauseBtn.textContent = 'Pause';
        if (backgroundAudio) backgroundAudio.play();
        
        const stepDuration = 60000 / (bpmSlider ? parseInt(bpmSlider.value) : 120) / 4;
        intervalId = setInterval(playStep, stepDuration);
    }

    function stopSequencer() {
        console.log('Stopping sequencer...');
        isPlaying = false;
        if (playPauseBtn) playPauseBtn.textContent = 'Play';
        if (backgroundAudio) backgroundAudio.pause();
        clearInterval(intervalId);
    }

    function playStep() {
        tracks.forEach((track, index) => {
            if (track.steps[currentStep]) {
                playSound(index);
            }
        });
        currentStep = (currentStep + 1) % 16;
    }

    function playSound(trackIndex) {
        console.log('Playing sound for track:', trackIndex);
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220 * (trackIndex + 1), audioContext.currentTime);
        
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    function loadBackgroundTrack() {
        console.log('Loading background track...');
        const selectedTrack = backgroundTrackSelect ? backgroundTrackSelect.value : '';
        if (selectedTrack) {
            backgroundAudio = new Audio(`/static/tracks/${selectedTrack}`);
            backgroundAudio.loop = true;
            if (isPlaying) {
                backgroundAudio.play();
            }
        } else {
            if (backgroundAudio) {
                backgroundAudio.pause();
                backgroundAudio = null;
            }
        }
        saveStateToLocalStorage();
    }

    function saveBeat() {
        console.log('Saving beat...');
        const beatName = prompt("Enter a name for your beat:");
        if (beatName) {
            const beatData = {
                name: beatName,
                bpm: bpmSlider ? parseInt(bpmSlider.value) : 120,
                backgroundTrack: backgroundTrackSelect ? backgroundTrackSelect.value : '',
                tracks: tracks.map(track => ({ steps: track.steps }))
            };

            fetch('/save_beat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(beatData)
            })
            .then(response => response.json())
            .then(data => {
                showSaveStatus(data.message, 'success');
                location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
                showSaveStatus('An error occurred while saving the beat.', 'danger');
            });
        }
    }

    function loadBeat() {
        console.log('Loading beat...');
        if (savedBeatsSelect) {
            const selectedBeatId = savedBeatsSelect.value;
            if (selectedBeatId) {
                fetch(`/load_beat/${selectedBeatId}`)
                .then(response => response.json())
                .then(data => {
                    tracksContainer.innerHTML = '';
                    tracks = [];

                    if (bpmSlider && bpmValue) {
                        bpmSlider.value = data.bpm;
                        bpmValue.textContent = data.bpm;
                    }

                    if (backgroundTrackSelect) {
                        backgroundTrackSelect.value = data.background_track;
                        loadBackgroundTrack();
                    }

                    data.tracks.forEach(track => {
                        addTrack(false);
                        const lastTrackIndex = tracks.length - 1;
                        tracks[lastTrackIndex].steps = track.steps;
                        updateTrackDisplay(lastTrackIndex);
                    });

                    saveStateToLocalStorage();
                    showSaveStatus('Beat loaded successfully!', 'success');
                })
                .catch(error => {
                    console.error('Error:', error);
                    showSaveStatus('An error occurred while loading the beat.', 'danger');
                });
            } else {
                showSaveStatus('Please select a beat to load.', 'warning');
            }
        }
    }

    function updateTrackDisplay(trackIndex) {
        console.log('Updating track display:', trackIndex);
        const trackDiv = tracksContainer.getElementsByClassName('track')[trackIndex];
        const stepButtons = trackDiv.querySelectorAll('.step');
        tracks[trackIndex].steps.forEach((isActive, stepIndex) => {
            stepButtons[stepIndex].classList.toggle('btn-primary', isActive);
            stepButtons[stepIndex].classList.toggle('btn-outline-secondary', !isActive);
        });
    }

    function showSaveStatus(message, type) {
        console.log('Showing save status:', message, type);
        if (saveStatus) {
            saveStatus.textContent = message;
            saveStatus.className = `alert alert-${type}`;
            saveStatus.style.display = 'block';
            setTimeout(() => {
                saveStatus.style.display = 'none';
            }, 3000);
        } else {
            console.log('Save status:', message);
        }
    }

    initializeBeatMaker();
    console.log('Beat maker initialization complete.');
});
