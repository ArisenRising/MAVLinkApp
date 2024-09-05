import { createSocket } from 'dgram';
import { Heartbeat } from 'mavlink-mappings/dist/lib/minimal';
import { MavLinkPacketSplitter, MavLinkPacketParser, MavLinkProtocolV2 } from 'node-mavlink';

const REGISTRY = {
    0: Heartbeat  
};

const socket = createSocket('udp4');
socket.bind(14561, '127.0.0.1');

socket.on('error', (err) => {
    console.error(`Socket error: ${err.message}`);
    socket.close();
});

const heartbeat = new Heartbeat();
heartbeat.type = 2; 
heartbeat.autopilot = 12; 
heartbeat.baseMode = 81; 
heartbeat.systemStatus = 4; 

const protocol = new MavLinkProtocolV2({
    sysid: 1, 
    compid: 1 
});

const buffer = protocol.serialize(heartbeat);

socket.send(buffer, 14550, '127.0.0.1', (err) => {
    if (err) {
        console.error('Error sending Heartbeat:', err);
    } else {
        console.log('Heartbeat sent successfully');
    }
});

const splitter = new MavLinkPacketSplitter();
const parser = new MavLinkPacketParser();

socket.on('message', (msg) => {
    try {
        splitter.write(msg); 
    } catch (err) {
        console.error(`Error writing message to splitter: ${err.message}`);
    }
});

splitter.pipe(parser).on('data', (packet) => {
    try {
        const clazz = REGISTRY[packet.header.msgid];
        if (clazz) {
            const message = packet.protocol.data(packet.payload, clazz); 

            if (message instanceof Heartbeat) {
                console.log('Received Heartbeat message');
                console.log(`Type: ${message.type}`);
                console.log(`Autopilot: ${message.autopilot}`);
                console.log(`Base mode: ${message.baseMode}`);
                console.log(`System status: ${message.systemStatus}`);
            }
        } else {
            console.log(`Unknown message ID: ${packet.header.msgid}`);
        }
    } catch (err) {
        console.error(`Error parsing MAVLink packet: ${err.message}`);
    }
});

console.log('Waiting for MAVLink messages...');
