import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  // Estructura: salas['codigo'] = { socketId1: 'jugada', socketId2: 'jugada' }
  private salas: { [codigoSala: string]: { [socketId: string]: string } } = {};

  @SubscribeMessage('unirseSala')
  handleUnirseSala(
    @MessageBody() data: { codigoSala: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.codigoSala);
    if (!this.salas[data.codigoSala]) {
      this.salas[data.codigoSala] = {};
    }
    
    // Registramos al jugador en la sala
    this.salas[data.codigoSala][client.id] = '';
    console.log(`Jugador ${client.id} se unió a la sala: ${data.codigoSala}`);
    
    client.emit('unidoExitosamente', { mensaje: `Te uniste a la sala ${data.codigoSala}` });
  }

  @SubscribeMessage('hacerJugada')
  handleJugada(
    @MessageBody() data: { codigoSala: string; jugada: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sala = this.salas[data.codigoSala];
    if (!sala) {
      console.log(`Sala no encontrada: ${data.codigoSala}`);
      return;
    }

    // Guardamos la jugada del cliente actual
    sala[client.id] = data.jugada;
    console.log(`Jugador ${client.id} hizo la jugada: ${data.jugada} en sala ${data.codigoSala}`);

    const jugadoresEnSala = Object.keys(sala);
    console.log(`Jugadores en sala (${jugadoresEnSala.length}):`, jugadoresEnSala);

    // Verificamos si ya hay 2 jugadores y ambos ya eligieron su jugada
    if (jugadoresEnSala.length === 2 && jugadoresEnSala.every(id => sala[id] && sala[id] !== '')) {
      const [id1, id2] = jugadoresEnSala;
      const jugada1 = sala[id1];
      const jugada2 = sala[id2];

      console.log(`Calculando ganador en sala ${data.codigoSala}: J1 [${jugada1}] vs J2 [${jugada2}]`);

      let resultado1 = '';
      let resultado2 = '';

      if (jugada1 === jugada2) {
        resultado1 = resultado2 = '¡Empate! 🤝';
      } else if (
        (jugada1 === 'Piedra 🪨' && jugada2 === 'Tijera ✂️') ||
        (jugada1 === 'Papel 📄' && jugada2 === 'Piedra 🪨') ||
        (jugada1 === 'Tijera ✂️' && jugada2 === 'Papel 📄')
      ) {
        resultado1 = '¡Ganaste! 🎉';
        resultado2 = '¡Perdiste! 🤖';
      } else {
        resultado1 = '¡Perdiste! 🤖';
        resultado2 = '¡Ganaste! 🎉';
      }

      // Enviamos el resultado a cada jugador de forma personalizada
      this.server.to(id1).emit('resultadoPartida', { tuJugada: jugada1, rivalJugada: jugada2, resultado: resultado1 });
      this.server.to(id2).emit('resultadoPartida', { tuJugada: jugada2, rivalJugada: jugada1, resultado: resultado2 });

      // Limpiamos las jugadas para que puedan jugar otra ronda en la misma sala
      sala[id1] = '';
      sala[id2] = '';
    }
  }
}