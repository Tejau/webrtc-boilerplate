import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const remoteAudioRef = useRef();
  const pcRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true  // Enable audio capture as well
      });
      console.log('Camera and microphone accessed successfully');
      localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access media devices: ' + err.message);
      return null;
    }
  };

  const createPeerConnection = () => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate);
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote track');
        if (event.track.kind === 'audio') {
          remoteAudioRef.current.srcObject = event.streams[0];
        } else if (event.track.kind === 'video') {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          setIsConnected(true);
        }
      };

      return pc;
    } catch (err) {
      console.error('Error creating peer connection:', err);
      setError('Failed to create peer connection: ' + err.message);
      return null;
    }
  };

  const startWebRTC = async () => {
    try {
      setError(null);
      const stream = await startCamera();
      if (!stream) return;

      const pc = createPeerConnection();
      if (!pc) return;

      pcRef.current = pc;

      // Add local video and audio tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log('Adding track to peer connection:', track.kind);
        pc.addTrack(track, stream);
      });

      // Create and send offer
      try {
        console.log('Creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('Local description set');

        const response = await fetch('https://lipsync.travelr.club/offer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sdp: pc.localDescription.sdp,
            type: pc.localDescription.type,
          }),
        });

        const answer = await response.json();
        console.log('Received answer from server');
        await pc.setRemoteDescription(answer);
        console.log('Remote description set');
      } catch (err) {
        console.error('Error during WebRTC setup:', err);
        setError('Failed to establish WebRTC connection: ' + err.message);
      }
    } catch (err) {
      console.error('Error in startWebRTC:', err);
      setError('Failed to start WebRTC: ' + err.message);
    }
  };

  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
    <div className="App">
      <div className="video-container">
        <div className="video-box">
          <h3>Local Video</h3>
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>
        <div className="video-box">
          <h3>Processed Video (B&W)</h3>
          <video ref={remoteVideoRef} autoPlay playsInline />
        </div>
        <div className="video-box">
          <h3>Remote Audio</h3>
          <audio ref={remoteAudioRef} autoPlay controls />
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      <button onClick={startWebRTC} disabled={isConnected}>
        {isConnected ? 'Connected' : 'Start Video Chat'}
      </button>
    </div>
  );
}

export default App;