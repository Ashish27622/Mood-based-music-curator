// ===== Spotify API Configuration =====
// REPLACE THESE WITH YOUR SPOTIFY APP CREDENTIALS
const SPOTIFY_CLIENT_ID = '35a2e37f26ed4717b2e3190437762f34'; // Register at https://developer.spotify.com/dashboard/
const SPOTIFY_REDIRECT_URI = 'http://localhost:3000'; // Must match exactly in Spotify Dashboard
const SPOTIFY_SCOPES = [
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state'
].join(' ');

// ===== Mood Configuration =====
const moodData = {
    happy: {
        displayName: "Happy",
        description: "Bright, uplifting tracks to boost your mood and energy. Perfect for sunny days and good vibes.",
        genres: ["pop", "dance", "disco", "happy"],
        parameters: {
            seed_genres: "pop,dance,disco",
            min_valence: 0.7,
            min_energy: 0.7,
            min_tempo: 120,
            limit: 20
        },
        tags: ["Upbeat", "Positive", "Energetic", "Feel-good"],
        color: "#FFD166"
    },
    sad: {
        displayName: "Melancholy",
        description: "Emotional, introspective songs for when you need to feel understood. Gentle melodies for quiet reflection.",
        genres: ["blues", "sad", "acoustic", "soul"],
        parameters: {
            seed_genres: "blues,soul,acoustic",
            max_valence: 0.4,
            max_energy: 0.5,
            max_tempo: 100,
            limit: 20
        },
        tags: ["Emotional", "Reflective", "Calm", "Introspective"],
        color: "#6A8EAE"
    },
    energetic: {
        displayName: "Energetic",
        description: "High-intensity tracks to fuel your workouts or dance sessions. Powerful beats to get you moving.",
        genres: ["rock", "electronic", "dance", "work-out"],
        parameters: {
            seed_genres: "rock,electronic,dance",
            min_energy: 0.8,
            min_tempo: 130,
            target_valence: 0.7,
            limit: 20
        },
        tags: ["Powerful", "Intense", "Motivational", "Upbeat"],
        color: "#EF476F"
    },
    relaxed: {
        displayName: "Relaxed",
        description: "Soothing, mellow tunes to help you unwind. Perfect for meditation, reading or chilling out.",
        genres: ["chill", "ambient", "jazz", "piano"],
        parameters: {
            seed_genres: "chill,ambient,jazz",
            max_energy: 0.4,
            max_tempo: 100,
            target_valence: 0.5,
            limit: 20
        },
        tags: ["Calm", "Peaceful", "Soothing", "Mellow"],
        color: "#06D6A0"
    },
    focused: {
        displayName: "Focused",
        description: "Concentration-enhancing instrumental music to boost productivity. Minimal distractions for maximum flow.",
        genres: ["classical", "instrumental", "lo-fi", "study"],
        parameters: {
            seed_genres: "classical,instrumental,lo-fi",
            target_energy: 0.5,
            target_tempo: 90,
            target_valence: 0.5,
            limit: 20
        },
        tags: ["Productive", "Concentration", "Study", "Flow"],
        color: "#118AB2"
    },
    romantic: {
        displayName: "Romantic",
        description: "Intimate, passionate songs for special moments. Smooth melodies to set the mood.",
        genres: ["r-n-b", "soul", "romance", "jazz"],
        parameters: {
            seed_genres: "r-n-b,soul,jazz",
            target_valence: 0.7,
            target_energy: 0.5,
            target_danceability: 0.6,
            limit: 20
        },
        tags: ["Intimate", "Passionate", "Sensual", "Love"],
        color: "#FF70A6"
    }
};

// ===== App State =====
let accessToken = null;
let currentUser = null;
let selectedMood = null;
let currentTracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let volume = 0.7;
let audioContext;
let analyser;
let audioElement = document.getElementById('audio-player');

// ===== DOM Elements =====
const loginBtn = document.getElementById('login-btn');
const userInfo = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const moodGrid = document.querySelector('.mood-grid');
const playlistNameInput = document.getElementById('playlist-name');
const savePlaylistBtn = document.getElementById('save-playlist-btn');
const playlistContainer = document.getElementById('playlist-container');
const loadingModal = document.getElementById('loading-modal');
const loadingMessage = document.getElementById('loading-message');
const progressText = document.getElementById('progress-text');
const moodModal = document.getElementById('mood-modal');
const moodModalTitle = document.getElementById('mood-modal-title');
const moodDescription = document.getElementById('mood-description');
const moodTags = document.getElementById('mood-tags');
const generateFromModalBtn = document.getElementById('generate-from-modal');
const closeModalBtn = document.querySelector('.close-modal');
const nowPlaying = document.getElementById('now-playing');
const progressBar = document.getElementById('progress-bar');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volumeSlider = document.getElementById('volume-slider');
const playAllBtn = document.getElementById('play-all-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const moodSearch = document.getElementById('mood-search');
const customMoodInput = document.getElementById('custom-mood-input');
const generateCustomBtn = document.getElementById('generate-custom-btn');
const trackCount = document.getElementById('track-count');
const playlistDuration = document.getElementById('playlist-duration');

// ===== Initialize the App =====
function init() {
    // Check for access token in URL (after Spotify redirect)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    
    if (token) {
        accessToken = token;
        window.history.pushState({}, document.title, window.location.pathname);
        loadUserProfile();
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Generate mood cards
    generateMoodCards();
    
    // Initialize audio
    initAudio();
    
    // Set initial volume
    audioElement.volume = volume;
    volumeSlider.value = volume;
}

// ===== Setup Event Listeners =====
function setupEventListeners() {
    // Auth
    loginBtn.addEventListener('click', handleLogin);
    
    // Playlist
    savePlaylistBtn.addEventListener('click', savePlaylistToSpotify);
    playAllBtn.addEventListener('click', playAllTracks);
    shuffleBtn.addEventListener('click', shufflePlaylist);
    
    // Audio controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPreviousTrack);
    nextBtn.addEventListener('click', playNextTrack);
    volumeSlider.addEventListener('input', adjustVolume);
    
    // Modal
    closeModalBtn.addEventListener('click', () => moodModal.classList.remove('active'));
    generateFromModalBtn.addEventListener('click', generateFromModal);
    
    // Search
    moodSearch.addEventListener('input', filterMoods);
    generateCustomBtn.addEventListener('click', generateCustomMood);
    
    // Audio events
    audioElement.addEventListener('timeupdate', updateProgressBar);
    audioElement.addEventListener('ended', playNextTrack);
    audioElement.addEventListener('play', () => {
        isPlaying = true;
        updatePlayPauseButton();
    });
    audioElement.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayPauseButton();
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === moodModal) {
            moodModal.classList.remove('active');
        }
    });
}

// ===== Spotify Authentication =====
function handleLogin() {
    showLoading('Connecting to Spotify...');
    
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(SPOTIFY_SCOPES)}&show_dialog=true`;
    
    window.location.href = authUrl;
}

// ===== User Profile =====
async function loadUserProfile() {
    showLoading('Loading your profile...');
    
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load profile');
        
        const data = await response.json();
        currentUser = data;
        
        // Update UI
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = data.display_name || data.id;
        userEmail.textContent = data.email || '';
        
        if (data.images && data.images.length > 0) {
            userAvatar.src = data.images[0].url;
        } else {
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.display_name || data.id)}&background=1DB954&color=fff`;
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading user profile:', error);
        hideLoading();
        alert('Failed to load user profile. Please try again.');
    }
}

// ===== Mood Selection =====
function generateMoodCards() {
    moodGrid.innerHTML = '';
    
    Object.entries(moodData).forEach(([moodId, mood]) => {
        const moodCard = document.createElement('div');
        moodCard.className = 'mood-card';
        moodCard.dataset.mood = moodId;
        
        moodCard.innerHTML = `
            <div class="mood-icon" style="color: ${mood.color}; border-color: ${mood.color}">
                <i class="fas ${getMoodIcon(moodId)}"></i>
            </div>
            <h3>${mood.displayName}</h3>
            <p>${mood.description.substring(0, 60)}...</p>
        `;
        
        moodCard.addEventListener('click', () => openMoodModal(moodId));
        moodGrid.appendChild(moodCard);
    });
}

function getMoodIcon(moodId) {
    const icons = {
        happy: 'fa-smile',
        sad: 'fa-sad-tear',
        energetic: 'fa-bolt',
        relaxed: 'fa-spa',
        focused: 'fa-brain',
        romantic: 'fa-heart'
    };
    return icons[moodId] || 'fa-music';
}

function openMoodModal(moodId) {
    const mood = moodData[moodId];
    
    moodModalTitle.textContent = mood.displayName;
    moodDescription.textContent = mood.description;
    moodModalTitle.style.color = mood.color;
    
    // Set tags
    moodTags.innerHTML = '';
    mood.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'mood-tag';
        tagElement.textContent = tag;
        tagElement.style.borderColor = mood.color;
        moodTags.appendChild(tagElement);
    });
    
    // Set generate button color
    generateFromModalBtn.style.background = mood.color;
    generateFromModalBtn.dataset.mood = moodId;
    
    moodModal.classList.add('active');
}

function generateFromModal() {
    const moodId = generateFromModalBtn.dataset.mood;
    selectMood(moodId);
    moodModal.classList.remove('active');
}

async function selectMood(moodId) {
    if (!accessToken) {
        alert('Please connect your Spotify account first');
        return;
    }
    
    selectedMood = moodId;
    const mood = moodData[moodId];
    
    showLoading(`Creating your perfect ${mood.displayName.toLowerCase()} playlist...`);
    
    try {
        const params = mood.parameters;
        const queryString = new URLSearchParams(params).toString();
        
        const response = await fetch(
            `https://api.spotify.com/v1/recommendations?${queryString}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to generate playlist');
        }
        
        const data = await response.json();
        currentTracks = data.tracks;
        
        // Update playlist name
        playlistNameInput.value = `${mood.displayName} Playlist - ${new Date().toLocaleDateString()}`;
        
        // Enable save button
        savePlaylistBtn.disabled = false;
        
        // Render tracks
        renderTracks();
        updatePlaylistStats();
        
        hideLoading();
    } catch (error) {
        console.error('Error generating playlist:', error);
        hideLoading();
        alert(`Failed to generate playlist: ${error.message}`);
    }
}

// ===== Custom Mood Generation =====
async function generateCustomMood() {
    const moodDescription = customMoodInput.value.trim();
    
    if (!moodDescription) {
        alert('Please describe your mood');
        return;
    }
    
    if (!accessToken) {
        alert('Please connect your Spotify account first');
        return;
    }
    
    showLoading(`Creating playlist for: "${moodDescription}"`);
    
    try {
        // In a real app, you might use AI here to generate parameters
        // For now, we'll use default parameters
        const params = {
            seed_genres: "pop",
            limit: 20
        };
        
        const queryString = new URLSearchParams(params).toString();
        
        const response = await fetch(
            `https://api.spotify.com/v1/recommendations?${queryString}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to generate playlist');
        }
        
        const data = await response.json();
        currentTracks = data.tracks;
        
        // Update playlist name
        playlistNameInput.value = `${moodDescription} Playlist - ${new Date().toLocaleDateString()}`;
        
        // Enable save button
        savePlaylistBtn.disabled = false;
        
        // Render tracks
        renderTracks();
        updatePlaylistStats();
        
        hideLoading();
    } catch (error) {
        console.error('Error generating custom playlist:', error);
        hideLoading();
        alert(`Failed to generate playlist: ${error.message}`);
    }
}

// ===== Playlist Rendering =====
function renderTracks() {
    if (!currentTracks || currentTracks.length === 0) {
        playlistContainer.innerHTML = `
            <div class="empty-state">
                <img src="assets/images/music-note.png" alt="Music note" class="empty-icon">
                <h3>No tracks found</h3>
                <p>Try a different mood or description</p>
                <div class="wave-animation">
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                </div>
            </div>
        `;
        return;
    }
    
    playlistContainer.innerHTML = `
        <div class="track-list">
            ${currentTracks.map((track, index) => `
                <div class="track-item ${index === currentTrackIndex && isPlaying ? 'playing' : ''}" data-id="${track.id}" data-index="${index}">
                    <img src="${track.album.images[0]?.url || 'https://via.placeholder.com/150/191414/FFFFFF?text=No+Image'}" 
                         alt="${track.name}" 
                         class="track-cover">
                    <div class="track-info">
                        <div class="track-name">${track.name}</div>
                        <div class="track-artist">${track.artists.map(a => a.name).join(', ')}</div>
                    </div>
                    <div class="track-duration">${formatDuration(track.duration_ms)}</div>
                    <div class="track-actions">
                        <button class="play-track-btn" data-preview="${track.preview_url || ''}" data-index="${index}">
                            <i class="fas ${index === currentTrackIndex && isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add event listeners to track items
    document.querySelectorAll('.track-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.play-track-btn')) {
                const index = parseInt(item.dataset.index);
                playTrack(index);
            }
        });
    });
    
    // Add event listeners to play buttons
    document.querySelectorAll('.play-track-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            playTrack(index);
        });
    });
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function updatePlaylistStats() {
    trackCount.textContent = `${currentTracks.length} ${currentTracks.length === 1 ? 'track' : 'tracks'}`;
    
    const totalDuration = currentTracks.reduce((sum, track) => sum + track.duration_ms, 0);
    const minutes = Math.floor(totalDuration / 60000);
    playlistDuration.textContent = `${minutes} min`;
}

// ===== Playlist Management =====
async function savePlaylistToSpotify() {
    if (!currentUser || !currentTracks || currentTracks.length === 0) return;
    
    const playlistName = playlistNameInput.value.trim() || `${moodData[selectedMood]?.displayName || 'My'} Playlist`;
    const trackUris = currentTracks.map(track => track.uri);
    
    showLoading('Saving your playlist to Spotify...');
    
    try {
        // 1. Create playlist
        const createResponse = await fetch(`https://api.spotify.com/v1/users/${currentUser.id}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: playlistName,
                description: `Auto-generated playlist created with Harmoniq`,
                public: true
            })
        });
        
        if (!createResponse.ok) throw new Error('Failed to create playlist');
        
        const playlist = await createResponse.json();
        
        // 2. Add tracks to playlist
        const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: trackUris
            })
        });
        
        if (!addTracksResponse.ok) throw new Error('Failed to add tracks to playlist');
        
        hideLoading();
        
        // Show success message
        const successModal = document.createElement('div');
        successModal.className = 'modal active';
        successModal.innerHTML = `
            <div class="modal-content" style="text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--primary); margin-bottom: 1rem;"></i>
                <h2>Playlist Saved!</h2>
                <p>Your playlist "${playlistName}" has been saved to your Spotify account.</p>
                <button id="open-in-spotify" class="btn btn-gradient" style="margin-top: 1.5rem;">
                    <i class="fab fa-spotify"></i> Open in Spotify
                </button>
                <button id="close-success" class="btn" style="margin-top: 1rem;">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(successModal);
        
        document.getElementById('open-in-spotify').addEventListener('click', () => {
            window.open(playlist.external_urls.spotify, '_blank');
            successModal.remove();
        });
        
        document.getElementById('close-success').addEventListener('click', () => {
            successModal.remove();
        });
    } catch (error) {
        console.error('Error saving playlist:', error);
        hideLoading();
        alert(`Failed to save playlist: ${error.message}`);
    }
}

function playAllTracks() {
    if (currentTracks.length === 0) return;
    
    currentTrackIndex = 0;
    playTrack(currentTrackIndex);
}

function shufflePlaylist() {
    if (currentTracks.length === 0) return;
    
    // Fisher-Yates shuffle algorithm
    for (let i = currentTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentTracks[i], currentTracks[j]] = [currentTracks[j], currentTracks[i]];
    }
    
    renderTracks();
    currentTrackIndex = 0;
}

// ===== Audio Playback =====
function initAudio() {
    try {
        // Create audio context for visualization (not used in this version)
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        
        // Create media element source
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
    } catch (e) {
        console.warn('Web Audio API not supported', e);
    }
}

function playTrack(index) {
    if (index < 0 || index >= currentTracks.length) return;
    
    const track = currentTracks[index];
    
    if (!track.preview_url) {
        alert('No preview available for this track');
        return;
    }
    
    currentTrackIndex = index;
    audioElement.src = track.preview_url;
    audioElement.play()
        .then(() => {
            isPlaying = true;
            updateNowPlaying(track);
            updatePlayPauseButton();
            highlightCurrentTrack();
        })
        .catch(error => {
            console.error('Playback failed:', error);
            alert('Failed to play track. Please try another one.');
        });
}

function togglePlayPause() {
    if (audioElement.paused) {
        if (audioElement.src) {
            audioElement.play();
        } else if (currentTracks.length > 0) {
            playTrack(0);
        }
    } else {
        audioElement.pause();
    }
}

function playPreviousTrack() {
    if (currentTracks.length === 0) return;
    
    const newIndex = (currentTrackIndex - 1 + currentTracks.length) % currentTracks.length;
    playTrack(newIndex);
}

function playNextTrack() {
    if (currentTracks.length === 0) return;
    
    const newIndex = (currentTrackIndex + 1) % currentTracks.length;
    playTrack(newIndex);
}

function updateNowPlaying(track) {
    nowPlaying.textContent = `Now Playing: ${track.name} - ${track.artists.map(a => a.name).join(', ')}`;
}

function updateProgressBar() {
    if (audioElement.duration) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressBar.style.width = `${progress}%`;
    }
}

function updatePlayPauseButton() {
    const icon = playPauseBtn.querySelector('i');
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

function highlightCurrentTrack() {
    document.querySelectorAll('.track-item').forEach(item => {
        item.classList.remove('playing');
    });
    
    const currentTrackElement = document.querySelector(`.track-item[data-index="${currentTrackIndex}"]`);
    if (currentTrackElement) {
        currentTrackElement.classList.add('playing');
        currentTrackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function adjustVolume() {
    volume = volumeSlider.value;
    audioElement.volume = volume;
}

// ===== Mood Search =====
function filterMoods() {
    const searchTerm = moodSearch.value.toLowerCase();
    
    document.querySelectorAll('.mood-card').forEach(card => {
        const moodId = card.dataset.mood;
        const mood = moodData[moodId];
        const cardText = `${mood.displayName} ${mood.description} ${mood.tags.join(' ')}`.toLowerCase();
        
        if (cardText.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===== Loading Modal =====
function showLoading(message) {
    loadingMessage.textContent = message;
    progressText.textContent = '0%';
    loadingModal.classList.add('active');
    
    // Simulate progress (for demo purposes)
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
        }
        progressText.textContent = `${Math.floor(progress)}%`;
    }, 200);
}

function hideLoading() {
    loadingModal.classList.remove('active');
}

// ===== Initialize the App =====
document.addEventListener('DOMContentLoaded', init);