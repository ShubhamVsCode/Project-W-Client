"use client";
import React, { useState, useEffect, useRef } from "react";
import socket from "./socketLib";
import SimplePeer from "simple-peer";

const ScreenShare = () => {
  const [roomId, setRoomId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [screenVideo, setScreenVideo] = useState<MediaStream | undefined>();

  const joinRoom = (roomId: string) => {
    socket.emit("join-room", { roomId, name });
  };

  useEffect(() => {
    socket.on("user-joined", ({ roomId, name }) => {
      console.log("user-joined", { roomId, name });
    });

    return () => {
      socket.off("user-joined");
    };
  }, []);

  const myPeer = useRef<SimplePeer.Instance | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  async function captureScreen() {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      setScreenVideo(mediaStream);
    } catch (error) {
      console.error("An error occurred while capturing screen", error);
    }
  }
  const setupWebRTC = (initiator: boolean) => {
    console.log("Setup WebRTC");
    myPeer.current = new SimplePeer({
      initiator,
      stream: screenVideo,
      trickle: false,
    });

    // Listen for signal data from the signaling server (socket)
    myPeer.current.on("signal", (data) => {
      console.log("Signal data: ", data);
      // Send the signaling data to the signaling server (socket)   
      socket.emit("webrtc-signal", data);
    });

    // Listen for signal data received from other peers
    socket.on("webrtc-signal", (data) => {
      console.log("From Server Signal data: ", data);
      myPeer.current?.signal(data);
    });

    // Listen for when the WebRTC connection is established
    myPeer.current.on("connect", () => {
      console.log("WebRTC connection established.");
    });

    // Listen for when the remote stream is received
    myPeer.current.on("stream", (remoteStream) => {
      // Do something with the remote stream, e.g., display it in a video element
      // In this example, we'll add the remote stream to the 'remoteVideoRef' video element
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });
  };

  return (
    <div>
      <h1>Screen Share</h1>
      <div>
        <label htmlFor="roomId">Room ID</label>
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="border border-black/30 px-2 py-2"
        />
      </div>
      <div>
        <label htmlFor="name">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-black/30 px-2 py-2"
        />
      </div>
      <button
        onClick={() => {
          joinRoom(roomId);
        }}
      >
        Join Room
      </button>

      <div></div>
    </div>
  );
};

export default ScreenShare;
