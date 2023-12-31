import { BadRequestException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RouletteRepository } from './roulette.repository';
import { randomRouletteGen } from '../../commons/helper';
import { JwtHelper } from '../../commons/jwt-helper';
import { CreateRequest } from '../../models/dto/request/create.request';
import { SpinRequest } from '../../models/dto/request/spin/spin.request';
import { User } from '../../models/entities/cache-user.model';
import { GameMode } from '../../models/enums/game-mode.enum';

@Injectable()
export class RouletteService {
  constructor(private readonly jwtHelper: JwtHelper, private readonly rouletteRepository: RouletteRepository) {}

  public getBalance(request: Request, createRequest: CreateRequest): number {
    if (createRequest.gameMode === GameMode.TESTING) {
      return createRequest.balance || 0;
    }

    // get balance from token
    const secretToken = this.jwtHelper.getToken(request);
    const payload = this.jwtHelper.getPayload(secretToken);
    return payload?.balance ? Number(payload.balance) : 0;
  }

  public async initializeSession(balance: number, userId: number, gameMode: GameMode) {
    const gameSession = await this.rouletteRepository.getGameSession(userId);

    if (gameSession) {
      return 'session is already initialized';
    }

    // initialize session inside redis
    this.rouletteRepository.initializeSession(balance, userId, gameMode);

    return null;
  }

  public async isBalanceChecked(spinRequest: SpinRequest) {
    const { userId, betInfo, gameMode } = spinRequest;
    const gameSession = await this.rouletteRepository.getGameSession(userId);
    if (!gameSession) throw new BadRequestException('gamesession not found');

    const sum = betInfo.reduce((p, c) => p + c.betAmount, 0);
    let winningNumber = randomRouletteGen();

    if (sum > gameSession.balance) {
      throw new BadRequestException('not enough balance');
    }

    if (gameMode === GameMode.TESTING) {
      winningNumber = spinRequest.winningNumber || winningNumber;
    }

    // determine winnig
    const finalVal: Array<{ val: number; type: 'inc' | 'dec' }> = betInfo.map(el => {
      if (el.betType === winningNumber) {
        return { type: 'inc', val: el.betAmount * 36 };
      } else if (
        (el.betType === 'even' && winningNumber % 2 === 0) ||
        (el.betType === 'odd' && winningNumber % 2 === 1)
      ) {
        return { type: 'inc', val: el.betAmount * 2 };
      } else {
        return { type: 'dec', val: el.betAmount };
      }
    });

    const amount = finalVal.reduce((acc, curr) => (curr.type === 'inc' ? acc + curr.val : acc - curr.val), 0);

    return { amount, gameSession };

    console.clear();
    console.log(finalVal);
    console.log({ winningNumber });
    console.log(amount);
    console.log(gameSession.balance);
  }

  public async updateBalance(spinRequest: SpinRequest, newBalance: number): Promise<User> {
    const { userId } = spinRequest;
    const gameSession = await this.rouletteRepository.getGameSession(userId);
    if (!gameSession) throw new BadRequestException('gamesession not found');

    // check if its less than 0 for user
    newBalance = gameSession.balance + newBalance < 0 ? 0 : gameSession.balance + newBalance;

    gameSession.balance = newBalance;
    await this.rouletteRepository.updateBalance(gameSession);
    return this.rouletteRepository.getGameSession(userId);
  }

  public async endSessions(userId: number) {
    const gameSession = await this.rouletteRepository.getGameSession(userId);

    if (gameSession) {
      await this.rouletteRepository.endSessions(userId);
    }
  }

  public getUserGameSession(userId: number): Promise<User> {
    return this.rouletteRepository.getGameSession(userId);
  }
}
