import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UserLoginDto {
    @ApiProperty({
        example: faker.internet.email(),
        description: 'Email, phone or username',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    public identifier: string;

    @ApiProperty({
        example: `${faker.string.alphanumeric(5).toLowerCase()}${faker.string
            .alphanumeric(5)
            .toUpperCase()}@@!${faker.number.int(1000)}`,
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    public password: string;
}
