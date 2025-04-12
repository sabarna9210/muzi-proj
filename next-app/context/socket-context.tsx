import { useSession } from "next-auth/react";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type SocketContextType = {
  socket: null | WebSocket;
  user: null | { id: string; token?: string };
  connectionError: boolean;
  setUser: Dispatch<SetStateAction<{ id: string; token?: string } | null>>;
  loading: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  user: null,
  connectionError: false,
  setUser: () => {},
  loading: true,
});

export const SocketContextProvider = ({ children }: PropsWithChildren) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [user, setUser] = useState<{ id: string; token?: string } | null>(null);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const session = useSession();

  const WSS_URL = process.env.NEXT_PUBLIC_WSS_URL;

  // Set user immediately when session is available
  useEffect(() => {
    if (session.data?.user?.id && !user) {
      setUser(session.data.user);
    }
  }, [session.data?.user]);

  // Set up WebSocket connection
  useEffect(() => {
    if (!WSS_URL) {
      setLoading(false);
      return;
    }

    if (!socket && session.data?.user?.id) {
      const ws = new WebSocket(WSS_URL);

      ws.onopen = () => {
        setSocket(ws);
        console.log("WebSocket connected");
        setLoading(false);
      };

      ws.onclose = () => {
        console.warn("WebSocket closed");
        setSocket(null);
        setLoading(false);
      };

      ws.onerror = () => {
        console.error("WebSocket error");
        setSocket(null);
        setConnectionError(true);
        setLoading(false);
      };

      return () => {
        ws.close();
      };
    }
  }, [socket, session.data?.user, WSS_URL]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        user,
        connectionError,
        setUser,
        loading,
      }}
    >
      {children}
     </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const { socket, user, setUser, connectionError, loading } = useContext(SocketContext);

  const sendMessage = (type: string, data: { [key: string]: any }) => {
    if (!socket) return;
    socket.send(
      JSON.stringify({
        type,
        data: {
          ...data,
          token: user?.token,
        },
      })
    );
  };

  return { socket, loading, setUser, sendMessage, user, connectionError };
};
