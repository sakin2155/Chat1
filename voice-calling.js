// ===========================
// WebRTC Voice Calling System
// ===========================
// Production-ready voice calling with Messenger-style UI
// Uses free STUN servers + optional free-tier TURN fallback

class VoiceCallManager {
    constructor() {
        // Call state
        this.callState = 'idle'; // idle, ringing, connecting, active, ended
        this.localStream = null;
        this.peerConnection = null;
        this.dataChannel = null;
        this.callStartTime = null;
        this.callDuration = 0;
        this.durationInterval = null;
        
        // User info
        this.currentUser = null;
        this.currentUserData = null;
        this.remoteUser = null;
        this.remoteUserData = null;
        this.currentChatId = null;
        this.currentChatUser = null;
        
        // Firestore listeners
        this.unsubscribeCallOffer = null;
        this.unsubscribeCallAnswer = null;
        this.unsubscribeIceCandidates = null;
        this.unsubscribeCallEnd = null;
        
        // Audio elements
        this.localAudio = null;
        this.remoteAudio = null;
        
        // UI elements
        this.callButton = null;
        this.callModal = null;
        this.ringingScreen = null;
        this.activeCallScreen = null;
        this.muteButton = null;
        this.speakerButton = null;
        this.endCallButton = null;
        this.acceptButton = null;
        this.declineButton = null;
        this.callStatusText = null;
        this.callDurationText = null;
        this.remoteAvatarImg = null;
        this.remoteNameText = null;
        
        // Audio state
        this.isMuted = false;
        this.isSpeakerOn = false;
        
        // WebRTC Configuration
        this.iceServers = [
            // Free public STUN servers (Google)
            { urls: ['stun:stun.l.google.com:19302'] },
            { urls: ['stun:stun1.l.google.com:19302'] },
            { urls: ['stun:stun2.l.google.com:19302'] },
            { urls: ['stun:stun3.l.google.com:19302'] },
            { urls: ['stun:stun4.l.google.com:19302'] },
            // Free-tier TURN server (optional fallback)
            // Using OpenRelay (free tier, no auth required)
            {
                urls: ['turn:openrelay.metered.ca:80'],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: ['turn:openrelay.metered.ca:443'],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ];
    }

    // ===========================
    // Initialization
    // ===========================
    
    async initialize(currentUser, currentUserData, currentChatId, currentChatUser, currentChatUserData) {
        this.currentUser = currentUser;
        this.currentUserData = currentUserData;
        this.currentChatId = currentChatId;
        this.currentChatUser = currentChatUser;
        this.remoteUserData = currentChatUserData;
        
        this.setupUIElements();
        this.setupEventListeners();
        this.setupAudioElements();
    }

    setupUIElements() {
        // Get or create call modal
        let callModal = document.getElementById('voice-call-modal');
        if (!callModal) {
            callModal = this.createCallModal();
            document.body.appendChild(callModal);
        }
        this.callModal = callModal;
        
        // Get UI elements
        this.callButton = document.getElementById('voice-call-btn');
        this.ringingScreen = document.getElementById('ringing-screen');
        this.activeCallScreen = document.getElementById('active-call-screen');
        this.muteButton = document.getElementById('mute-btn');
        this.speakerButton = document.getElementById('speaker-btn');
        this.endCallButton = document.getElementById('end-call-btn');
        this.acceptButton = document.getElementById('accept-call-btn');
        this.declineButton = document.getElementById('decline-call-btn');
        this.callStatusText = document.getElementById('call-status-text');
        this.callDurationText = document.getElementById('call-duration-text');
        this.remoteAvatarImg = document.getElementById('remote-avatar-img');
        this.remoteNameText = document.getElementById('remote-name-text');
    }

    setupEventListeners() {
        if (this.callButton) {
            this.callButton.addEventListener('click', () => this.initiateCall());
        }
        if (this.acceptButton) {
            this.acceptButton.addEventListener('click', () => this.acceptCall());
        }
        if (this.declineButton) {
            this.declineButton.addEventListener('click', () => this.declineCall());
        }
        if (this.endCallButton) {
            this.endCallButton.addEventListener('click', () => this.endCall());
        }
        if (this.muteButton) {
            this.muteButton.addEventListener('click', () => this.toggleMute());
        }
        if (this.speakerButton) {
            this.speakerButton.addEventListener('click', () => this.toggleSpeaker());
        }
    }

    setupAudioElements() {
        // Create audio elements if they don't exist
        let localAudio = document.getElementById('local-audio');
        let remoteAudio = document.getElementById('remote-audio');
        
        if (!localAudio) {
            localAudio = document.createElement('audio');
            localAudio.id = 'local-audio';
            localAudio.muted = true;
            document.body.appendChild(localAudio);
        }
        
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = 'remote-audio';
            remoteAudio.autoplay = true;
            remoteAudio.playsinline = true;
            document.body.appendChild(remoteAudio);
        }
        
        this.localAudio = localAudio;
        this.remoteAudio = remoteAudio;
    }

    // ===========================
    // Call Initiation
    // ===========================
    
    async initiateCall() {
        if (this.callState !== 'idle') {
            console.warn('Call already in progress');
            return;
        }

        try {
            this.callState = 'ringing';
            this.updateCallStatus('Requesting microphone...');
            
            // Request microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            // Show ringing screen
            this.showRingingScreen();
            this.updateCallStatus('Calling...');

            // Create peer connection
            await this.createPeerConnection();

            // Add local stream to peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Create and send offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });

            await this.peerConnection.setLocalDescription(offer);

            // Send offer to remote user via Firestore
            await this.sendCallSignal('offer', offer);

            // Listen for answer
            this.listenForCallAnswer();
            this.listenForIceCandidates();

            console.log('Call initiated, waiting for answer...');
        } catch (error) {
            console.error('Error initiating call:', error);
            this.updateCallStatus(`Error: ${error.message}`);
            this.endCall();
        }
    }

    async acceptCall() {
        if (this.callState !== 'ringing') {
            console.warn('No incoming call to accept');
            return;
        }

        try {
            this.callState = 'connecting';
            this.updateCallStatus('Connecting...');

            // Get the stored offer from Firestore
            const offerDoc = await window.db.collection('calls').doc(this.currentChatId).get();
            if (!offerDoc.exists || !offerDoc.data().offer) {
                throw new Error('No offer found');
            }

            const offer = offerDoc.data().offer;

            // Set remote description
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Send answer back
            await this.sendCallSignal('answer', answer);

            // Show active call screen
            this.showActiveCallScreen();
            this.updateCallStatus('Connected');
            this.startCallDuration();

            console.log('Call accepted, answer sent');
        } catch (error) {
            console.error('Error accepting call:', error);
            this.updateCallStatus(`Error: ${error.message}`);
            this.endCall();
        }
    }

    async declineCall() {
        await this.endCall();
    }

    // ===========================
    // Peer Connection Setup
    // ===========================
    
    async createPeerConnection() {
        const peerConnection = new RTCPeerConnection({
            iceServers: this.iceServers
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendIceCandidate(event.candidate);
            }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('Remote track received:', event.track.kind);
            if (event.streams && event.streams[0]) {
                this.remoteAudio.srcObject = event.streams[0];
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            switch (peerConnection.connectionState) {
                case 'connected':
                    this.updateCallStatus('Connected');
                    if (this.callState === 'connecting') {
                        this.callState = 'active';
                        this.showActiveCallScreen();
                        this.startCallDuration();
                    }
                    break;
                case 'disconnected':
                    this.updateCallStatus('Disconnected');
                    break;
                case 'failed':
                    this.updateCallStatus('Connection failed');
                    this.endCall();
                    break;
                case 'closed':
                    this.updateCallStatus('Call ended');
                    this.endCall();
                    break;
            }
        };

        // Handle ICE connection state
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
        };

        this.peerConnection = peerConnection;
    }

    // ===========================
    // Signaling
    // ===========================
    
    async sendCallSignal(type, data) {
        try {
            const callDocRef = window.db.collection('calls').doc(this.currentChatId);
            
            const signalData = {
                [type]: data,
                sender: this.currentUser.uid,
                receiver: this.currentChatUser,
                timestamp: window.firebase.firestore.serverTimestamp()
            };

            await callDocRef.set(signalData, { merge: true });
            console.log(`Sent ${type}:`, data);
        } catch (error) {
            console.error(`Error sending ${type}:`, error);
        }
    }

    async sendIceCandidate(candidate) {
        try {
            const candidatesRef = window.db
                .collection('calls')
                .doc(this.currentChatId)
                .collection('iceCandidates')
                .doc(this.currentUser.uid);

            await candidatesRef.set({
                candidates: window.firebase.firestore.arrayUnion(candidate)
            }, { merge: true });
        } catch (error) {
            console.error('Error sending ICE candidate:', error);
        }
    }

    listenForCallAnswer() {
        if (this.unsubscribeCallAnswer) {
            this.unsubscribeCallAnswer();
        }

        this.unsubscribeCallAnswer = window.db
            .collection('calls')
            .doc(this.currentChatId)
            .onSnapshot(async (doc) => {
                if (doc.exists && doc.data().answer) {
                    const answer = doc.data().answer;
                    if (this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
                        try {
                            await this.peerConnection.setRemoteDescription(
                                new RTCSessionDescription(answer)
                            );
                            console.log('Answer received and set');
                            this.callState = 'connecting';
                            this.updateCallStatus('Connecting...');
                        } catch (error) {
                            console.error('Error setting remote description:', error);
                        }
                    }
                }
            });
    }

    listenForIceCandidates() {
        if (this.unsubscribeIceCandidates) {
            this.unsubscribeIceCandidates();
        }

        this.unsubscribeIceCandidates = window.db
            .collection('calls')
            .doc(this.currentChatId)
            .collection('iceCandidates')
            .doc(this.currentChatUser)
            .onSnapshot((doc) => {
                if (doc.exists && doc.data().candidates) {
                    const candidates = doc.data().candidates;
                    candidates.forEach(async (candidate) => {
                        try {
                            if (this.peerConnection) {
                                await this.peerConnection.addIceCandidate(
                                    new RTCIceCandidate(candidate)
                                );
                                console.log('ICE candidate added');
                            }
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    });
                }
            });
    }

    // ===========================
    // Call Control
    // ===========================
    
    toggleMute() {
        if (!this.localStream) return;

        this.isMuted = !this.isMuted;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });

        if (this.muteButton) {
            this.muteButton.classList.toggle('muted', this.isMuted);
            this.muteButton.textContent = this.isMuted ? '🔇' : '🔊';
        }
    }

    toggleSpeaker() {
        this.isSpeakerOn = !this.isSpeakerOn;
        
        if (this.remoteAudio) {
            // In web, we can't directly control speaker vs earpiece
            // But we can control volume and audio routing hints
            this.remoteAudio.volume = this.isSpeakerOn ? 1.0 : 0.7;
        }

        if (this.speakerButton) {
            this.speakerButton.classList.toggle('speaker-on', this.isSpeakerOn);
            this.speakerButton.textContent = this.isSpeakerOn ? '📢' : '📱';
        }
    }

    startCallDuration() {
        this.callStartTime = Date.now();
        this.callDuration = 0;

        this.durationInterval = setInterval(() => {
            this.callDuration = Math.floor((Date.now() - this.callStartTime) / 1000);
            this.updateCallDuration();
        }, 1000);
    }

    updateCallDuration() {
        if (!this.callDurationText) return;

        const minutes = Math.floor(this.callDuration / 60);
        const seconds = this.callDuration % 60;
        this.callDurationText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateCallStatus(status) {
        if (this.callStatusText) {
            this.callStatusText.textContent = status;
        }
        console.log('Call status:', status);
    }

    async endCall() {
        try {
            // Stop all tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            // Close peer connection
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            // Stop duration timer
            if (this.durationInterval) {
                clearInterval(this.durationInterval);
                this.durationInterval = null;
            }

            // Unsubscribe from listeners
            if (this.unsubscribeCallOffer) this.unsubscribeCallOffer();
            if (this.unsubscribeCallAnswer) this.unsubscribeCallAnswer();
            if (this.unsubscribeIceCandidates) this.unsubscribeIceCandidates();
            if (this.unsubscribeCallEnd) this.unsubscribeCallEnd();

            // Clear call data from Firestore
            try {
                await window.db.collection('calls').doc(this.currentChatId).delete();
            } catch (e) {
                console.log('Call document already deleted or does not exist');
            }

            // Reset state
            this.callState = 'idle';
            this.isMuted = false;
            this.isSpeakerOn = false;
            this.callDuration = 0;

            // Hide call modal
            this.hideCallModal();

            console.log('Call ended');
        } catch (error) {
            console.error('Error ending call:', error);
        }
    }

    // ===========================
    // UI Management
    // ===========================
    
    showRingingScreen() {
        if (this.callModal) {
            this.callModal.classList.remove('hidden');
        }
        if (this.ringingScreen) {
            this.ringingScreen.classList.remove('hidden');
        }
        if (this.activeCallScreen) {
            this.activeCallScreen.classList.add('hidden');
        }

        // Update remote user info
        if (this.remoteAvatarImg && this.remoteUserData?.photoURL) {
            this.remoteAvatarImg.src = this.remoteUserData.photoURL;
        }
        if (this.remoteNameText && this.remoteUserData?.displayName) {
            this.remoteNameText.textContent = this.remoteUserData.displayName;
        }
    }

    showActiveCallScreen() {
        if (this.ringingScreen) {
            this.ringingScreen.classList.add('hidden');
        }
        if (this.activeCallScreen) {
            this.activeCallScreen.classList.remove('hidden');
        }
    }

    hideCallModal() {
        if (this.callModal) {
            this.callModal.classList.add('hidden');
        }
        if (this.ringingScreen) {
            this.ringingScreen.classList.add('hidden');
        }
        if (this.activeCallScreen) {
            this.activeCallScreen.classList.add('hidden');
        }
    }

    // ===========================
    // Modal Creation
    // ===========================
    
    createCallModal() {
        const modal = document.createElement('div');
        modal.id = 'voice-call-modal';
        modal.className = 'voice-call-modal hidden';
        modal.innerHTML = `
            <!-- Ringing Screen -->
            <div id="ringing-screen" class="call-screen ringing-screen hidden">
                <div class="call-screen-content">
                    <div class="call-avatar-container">
                        <img id="remote-avatar-img" src="?" alt="User" class="call-avatar">
                        <div class="ringing-pulse"></div>
                    </div>
                    <div class="call-info">
                        <h2 id="remote-name-text">User</h2>
                        <p id="call-status-text" class="call-status">Calling...</p>
                    </div>
                    <div class="call-actions ringing-actions">
                        <button id="decline-call-btn" class="call-btn decline-btn" title="Decline">
                            <span class="btn-icon">📞</span>
                        </button>
                        <button id="accept-call-btn" class="call-btn accept-btn" title="Accept">
                            <span class="btn-icon">✓</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Active Call Screen -->
            <div id="active-call-screen" class="call-screen active-call-screen hidden">
                <div class="call-screen-content">
                    <div class="call-header">
                        <div class="call-info-active">
                            <h3 id="remote-name-text-active" class="call-name">User</h3>
                            <p id="call-duration-text" class="call-duration">0:00</p>
                        </div>
                    </div>

                    <div class="call-avatar-container-active">
                        <img id="remote-avatar-img-active" src="?" alt="User" class="call-avatar-active">
                    </div>

                    <div class="call-actions active-call-actions">
                        <button id="mute-btn" class="call-btn control-btn mute-btn" title="Mute">
                            <span class="btn-icon">🔊</span>
                        </button>
                        <button id="speaker-btn" class="call-btn control-btn speaker-btn" title="Speaker">
                            <span class="btn-icon">📱</span>
                        </button>
                        <button id="end-call-btn" class="call-btn end-call-btn" title="End Call">
                            <span class="btn-icon">📞</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }
}

// ===========================
// Export for use in main app
// ===========================
window.VoiceCallManager = VoiceCallManager;
