import PopUp from "@/components/PopUp";
import ScreenShare from "@/components/ScreenShare";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      <h1>Hello Wisher!</h1>
      {/* <PopUp /> */}
      {/* <ScreenShare /> */}

      <div>
        Room Id
        <input
          type="text"
          className="border border-blue-300 rounded px-2 py-2"
        />
      </div>
      <div>
        Room Id
        <input
          type="text"
          className="border border-blue-300 rounded px-2 py-2"
        />
      </div>
    </main>
  );
}
