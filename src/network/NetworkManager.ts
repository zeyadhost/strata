import Peer, { DataConnection } from "peerjs";

export type NetworkRole = "host" | "client";

export interface NetworkEventPayload {
  type: string;
  data: any;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private role: NetworkRole = "host";
  public lobbyCode: string | null = null;
  private onDataCallback: (data: NetworkEventPayload, fromId: string) => void = () => {};
  private onConnectCallback: (peerId: string) => void = () => {};
  private onDisconnectCallback: (peerId: string) => void = () => {};

  constructor() {}

  public async initialize(isHost: boolean, lobbyCode?: string): Promise<string> {
    this.role = isHost ? "host" : "client";

    return new Promise((resolve, reject) => {
      
      
      const peerId = isHost ? this.generateLobbyCode() : undefined;
      this.peer = peerId ? new Peer(peerId) : new Peer();

      this.peer.on("open", (id) => {
        console.log(`[Network] Peer opened with ID: ${id}`);
        if (isHost) {
          this.lobbyCode = id;
          this.setupHostListeners();
          resolve(id);
        } else if (lobbyCode) {
          this.lobbyCode = lobbyCode;
          this.connectToHost(lobbyCode)
            .then(() => resolve(id))
            .catch(reject);
        }
      });
      

      this.peer.on("error", (err) => {
        console.error("[Network] Peer error:", err);
        reject(err);
      });
    });
  }

  private setupHostListeners() {
    if (!this.peer) return;

    this.peer.on("connection", (conn) => {
      console.log(`[Network] Incoming connection from: ${conn.peer}`);
      this.handleConnection(conn);
    });
  }

  private async connectToHost(hostId: string): Promise<void> {
    if (!this.peer) return;

    console.log(`[Network] Connecting to host: ${hostId}`);
    const conn = this.peer.connect(hostId, {
        reliable: true
    });

    return new Promise((resolve, reject) => {
      conn.on("open", () => {
        console.log(`[Network] Connected to host: ${hostId}`);
        this.handleConnection(conn);
        resolve();
      });

      conn.on("error", (err) => {
        console.error("[Network] Connection error:", err);
        reject(err);
      });

      
      setTimeout(() => {
        if (!this.connections.has(hostId)) {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  private handleConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on("data", (data) => {
      this.onDataCallback(data as NetworkEventPayload, conn.peer);
    });

    conn.on("close", () => {
      console.log(`[Network] Connection closed: ${conn.peer}`);
      this.connections.delete(conn.peer);
      this.onDisconnectCallback(conn.peer);
    });

    this.onConnectCallback(conn.peer);
  }

  public send(type: string, data: any, targetId?: string) {
    const payload: NetworkEventPayload = { type, data };

    if (targetId) {
      const conn = this.connections.get(targetId);
      if (conn && conn.open) {
        conn.send(payload);
      }
    } else {
      
      this.connections.forEach((conn) => {
        if (conn.open) {
          conn.send(payload);
        }
      });
    }
  }

  public onData(callback: (data: NetworkEventPayload, fromId: string) => void) {
    this.onDataCallback = callback;
  }

  public onConnect(callback: (peerId: string) => void) {
    this.onConnectCallback = callback;
  }

  public onDisconnect(callback: (peerId: string) => void) {
    this.onDisconnectCallback = callback;
  }

  public isHost(): boolean {
    return this.role === "host";
  }

  private generateLobbyCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public disconnect() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
      this.connections.clear();
    }
  }
}
