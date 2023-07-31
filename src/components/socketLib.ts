import { Socket, io } from "socket.io-client";

const socket: Socket = io("http://localhost:4001");

export default socket