import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SingInUserDto } from './dto/singIn.-user.dto';
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  };

  @Post('SingIn')
  SingIn(@Body() singInUserDto:SingInUserDto) {
    return this.userService.singIn(singInUserDto);
  };

  @Get('verifyToken/:token')
  verifyToken(@Param('token') token: string) {
    return this.userService.verifyToken(token);
  };

  @Get()
  findAll() {
    return this.userService.findAll();
  };

  @Get('allBy/:CNPJ')
  findAllByCNPJ(@Param('CNPJ') CNPJ: string){
    return this.userService.findAllByCNPJ(CNPJ);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  };

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  };

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  };
}
