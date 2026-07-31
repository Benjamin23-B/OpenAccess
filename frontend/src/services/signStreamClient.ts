/* eslint-disable @typescript-eslint/no-explicit-any */
// WebSocket client for Text-to-Sign streaming

export class SignStreamClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onPoseReceived: (poseData: any) => void;

  constructor(url: string, onPoseReceived: (poseData: any) => void) {
    this.url = url;
    this.onPoseReceived = onPoseReceived;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('SignStreamClient connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const poseData = JSON.parse(event.data);
        this.onPoseReceived(poseData);
      } catch (e) {
        console.error('Failed to parse incoming pose data:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('SignStreamClient WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('SignStreamClient disconnected');
    };
  }

  requestSign(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text }));
    } else {
      console.warn('Cannot send request, WebSocket is not open');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
