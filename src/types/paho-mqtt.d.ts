declare module 'paho-mqtt' {
  class Client {
    constructor(brokerUrl: string, clientId: string);
    connect(options: ClientConnectOptions): void;
    disconnect(): void;
    subscribe(topic: string, options?: SubscribeOptions): void;
    unsubscribe(topic: string): void;
    send(message: Message): void;
    onConnectionLost: (responseObject: any) => void;
    onMessageArrived: (message: Message) => void;
  }

  class Message {
    destinationName: string;
    payloadString: string;
    qos: number;
    retained: boolean;
    constructor(payloadString: string);
  }

  interface ClientConnectOptions {
    onSuccess?: () => void;
    onFailure?: (error: any) => void;
    useSSL?: boolean;
    userName?: string;
    password?: string;
    cleanSession?: boolean;
    reconnect?: boolean;
  }

  interface SubscribeOptions {
    qos?: number;
  }

  export { Client, Message };
  export default { Client, Message };
}
