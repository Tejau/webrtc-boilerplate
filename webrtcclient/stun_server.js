const { RTCPeerConnection } = require('wrtc');

const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:your-stun-server.com:3478' }]
  });
  
  pc.onicecandidate = (e) => {
    if (e.candidate && e.candidate.type === 'srflx') {
      console.log('STUN server is working:', e.candidate);
    }
  };
  
  pc.createDataChannel('');
  pc.createOffer().then(offer => pc.setLocalDescription(offer));