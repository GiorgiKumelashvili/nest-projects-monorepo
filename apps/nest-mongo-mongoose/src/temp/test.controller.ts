import {
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError } from 'mongoose';
import { Car, CarDocument, User, UserDocument } from './user.model';

class GenericException extends HttpException {
  constructor(statusCode: HttpStatus, message?: string, messageCode?: string) {
    super({ message, messageCode, statusCode }, statusCode);
  }
}

@Controller('test')
export class TestControler {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Car.name)
    private readonly carModel: Model<CarDocument>,
  ) {}

  @Get()
  getUsers() {
    return this.userModel.find();
  }

  @Get('custom')
  getUser() {
    // return this.userModel.findOne({
    //   'car.color': 'red',
    // });

    // alternative
    // return this.userModel.findOne({
    //   [fieldJoin(userFields.car, carFiels.color)]: 'red',
    // });

    // best for intelisense
    return this.userModel.findOne({
      [User.carColorField()]: 'red',
    });
  }

  @Post()
  async createUser() {
    const car = new this.carModel({
      color: 'blue',
      name: 'BMW',
    });

    const user = new this.userModel({
      firstName: 'nino',
      lastName: 'kumelashvili',
      age: 210,
      car,
    });

    const createUser = await user.save();

    return {
      message: 'created user',
      user: createUser,
    };
  }

  @Patch()
  public async updateUser() {
    try {
      // doesnt return new user just update result
      const updatedUser = await this.userModel.updateOne(
        {
          _id: '62fe18616a8aeb63cfd41340',
        },
        {
          $set: {
            age: 23,
            firstName: 'adssa',
          },
        },
      );

      if (updatedUser.matchedCount === 0) {
        throw new GenericException(HttpStatus.NOT_FOUND, 'Could not find specified item', 'ItemNotFound');
      }

      return { message: 'updated user' };

      // best way
      // const userProps: Partial<User> = {
      //   age: 18,
      //   firstName: 'gio',
      // };

      // const updatedUser = await this.userModel.findOneAndUpdate(
      //   { _id: '62fe18ebd8281bb360b398f0' },
      //   userProps,
      //   { new: true }, // returns updated user
      // );

      // if (!updatedUser) {
      //   throw new GenericException(
      //     HttpStatus.NOT_FOUND,
      //     'Could not find specified item',
      //     'ItemNotFound',
      //   );
      // }

      // return {
      //   message: 'updated user',
      //   user: updatedUser,
      // };
    } catch (error) {
      if (error instanceof MongooseError) {
        throw new GenericException(HttpStatus.BAD_REQUEST, error.message, MongooseError.name);
      }

      if (error instanceof GenericException) {
        throw error;
      }

      // else something wrong
      throw new InternalServerErrorException('something went wrong try again');
    }
  }

  @Delete()
  public async deleteUser() {
    try {
      // deleting and returning item
      const deleteResult = await this.userModel.findOneAndDelete({
        _id: '62fe018a18f72548ce58f3e9',
      });

      if (!deleteResult) {
        throw new GenericException(HttpStatus.NOT_FOUND, 'Could not find specified item', 'ItemNotFound');
      }

      // or

      // for just deleting and not returning item
      // const deleteResult = await this.userModel.deleteOne({
      //   _id: '62fe021fe8f8e6d1b9278a8f',
      // });

      // if (deleteResult.deletedCount === 0) {
      //   throw new TempException(
      //     HttpStatus.NOT_FOUND,
      //     'Could not find specified item',
      //     'ItemNotFound',
      //   );
      // }
    } catch (error) {
      if (error instanceof MongooseError) {
        throw new GenericException(HttpStatus.BAD_REQUEST, error.message, MongooseError.name);
      }

      if (error instanceof GenericException) {
        throw error;
      }

      // else something wrong
      throw new InternalServerErrorException('something went wrong try again');
    }
  }
}
