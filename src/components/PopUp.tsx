"use client";

import React, { FC, useCallback, useState, useEffect, useRef } from "react";
import socket from "./socketLib";
import { v4 as uuid } from "uuid";
import SimplePeer from "simple-peer";

interface Message {
  id: string;
  name: string;
  text: string;
}

const PopUp: FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");

  const [screenVideo, setScreenVideo] = useState<MediaStream | undefined>();
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [isReceivingCall, setIsReceivingCall] = useState<boolean>(false);

  const joinRoom = (roomId: string) => {
    socket.emit("join-room", { roomId, name });
  };

  const sendMessage = () => {
    const currentMessage: Message = {
      id: uuid(),
      name: name,
      text: text,
    };

    socket.emit("message-sent", currentMessage);
    setText("");
  };

  useEffect(() => {
    socket.on("user-joined", ({ roomId, name }) => {
      console.log("Joined Room", { roomId, name });
    });

    socket.on("message-received", (message: Message) => {
      console.log("Message From " + message.name);
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("user-joined");
      socket.off("message-received");
    };
  }, []);

  async function captureScreen() {
    let mediaStream = null;
    try {
      mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      setScreenVideo(mediaStream);
    } catch (ex) {
      console.log("Error occurred", ex);
    }
  }

  const myPeer = useRef<SimplePeer.Instance | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

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

  // Function to initiate a call
  const initiateCall = () => {
    if (screenVideo) {
      setIsCalling(true);
      // Emit a "call-user" event to the server (socket) to invite the other user
      socket.emit("call-user", { roomId, name });
    }
  };

  // Function to accept the call and start screen sharing
  const acceptCall = useCallback(() => {
    setIsReceivingCall(false);

    // When accepting the call, we should use the recipient's stream (screenVideo) as the initiator.
    setupWebRTC(true);
  }, [screenVideo]);

  useEffect(() => {
    // Listen for a "call-made" event from the signaling server (socket)
    socket.on("call-made", async () => {
      // Display a notification or UI prompt to ask the user if they want to accept the call
      setIsReceivingCall(true);
    });

    // Function to stop the WebRTC connection
    const closeWebRTC = () => {
      if (myPeer.current) {
        myPeer.current.destroy();
        myPeer.current = null;
      }
    };

    // Only set up the WebRTC connection when the component mounts or when screen sharing starts.
    // We no longer set it up here when accepting a call, as it is handled separately in the acceptCall function.
    if (screenVideo && !isReceivingCall) {
      setupWebRTC(true);
    } else {
      closeWebRTC();
    }

    return () => {
      // Component unmount, close the WebRTC connection
      closeWebRTC();
      socket.off("call-made");
    };
  }, [screenVideo, isReceivingCall]);

  return (
    <div>
      <input
        type="text"
        className="text-black"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setRoomId(e.target.value);
        }}
      />
      <div>
        <input
          type="text"
          placeholder="Name"
          className="text-black"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setName(e.target.value);
          }}
        />
        <button
          className="border border-white px-3"
          onClick={() => joinRoom(roomId)}
        >
          Start Chatting
        </button>
        {messages?.map((message) => (
          <div key={message.id}>{message.text}</div>
        ))}
        <div>
          <input
            type="text"
            className="text-black"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setText(e.target.value)
            }
            value={text}
          />
          <button onClick={sendMessage} className="">
            Send
          </button>
        </div>

        <div>
          <button onClick={captureScreen} className="">
            Capture Screen
          </button>
        </div>

        {/* Show the "Start Call" button only if not already in a call */}
        {!isCalling && !isReceivingCall && (
          <button onClick={initiateCall} className="">
            Start Call
          </button>
        )}

        {/* Display a notification or UI prompt when receiving a call */}
        {isReceivingCall && (
          <div>
            <p>You are receiving a call from {name}. Do you want to accept?</p>
            <button onClick={acceptCall} className="">
              Accept Call
            </button>
          </div>
        )}

        <div>
          <video
            autoPlay
            ref={(videoElement) => {
              if (videoElement && screenVideo) {
                videoElement.srcObject = screenVideo;
              }
            }}
          />
        </div>

        <div>
          {/* Display the remote video received from other peers */}
          <video
            autoPlay
            ref={remoteVideoRef}
            style={{ display: screenVideo ? "block" : "none" }}
          />
        </div>
      </div>
    </div>
  );
};

export default PopUp;
