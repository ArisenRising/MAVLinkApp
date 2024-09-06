import { createSocket } from 'dgram';
import { Heartbeat } from 'mavlink-mappings/dist/lib/minimal';
import { BatteryStatus } from 'mavlink-mappings/dist/lib/common'; 
import { MavLinkPacketSplitter, MavLinkPacketParser, MavLinkProtocolV2 } from 'node-mavlink';

const REGISTRY = {
    0: Heartbeat,  
    147: BatteryStatus  
};

const socket = createSocket('udp4');
socket.bind(14561, '127.0.0.1');  

socket.on('error', (err) => {
    console.error(`Socket error: ${err.message}`);
    socket.close();
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

            if (message instanceof BatteryStatus) {
                console.log("Received BatteryStatus message");
                console.log(`- Battery ID: ${message.id}`);
                console.log(`- Battery Function: ${message.batteryFunction}`);
                console.log(`- Battery Type: ${message.type}`);
                console.log(`- Temperature: ${message.temperature / 100} °C`);
                console.log(`- Voltages: ${message.voltages.map(v => v / 1000).join(', ')} V`);
                console.log(`- Current Battery: ${message.currentBattery / 100} A`);
                console.log(`- Battery Remaining: ${message.batteryRemaining} %`);
            }
        } else {
            console.log(`Unknown message ID: ${packet.header.msgid}`);
        }
    } catch (err) {
        console.error(`Error parsing MAVLink packet: ${err.message}`);
    }
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

socket.send(buffer, 14561, '127.0.0.1', (err) => {
    if (err) {
        console.error('Error sending Heartbeat:', err);
    } else {
        console.log('Heartbeat sent successfully');
    }
});

console.log('Waiting for MAVLink messages...');
