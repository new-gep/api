import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CardCompany {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 150,})
    name: string;

    @Column({length: 16,})
    number: string;

    @Column({length: 3,})
    cvc: string;

    @Column({length: 5,})
    expiry: string;

    @Column({length: 14,})
    CNPJ: string;

    @Column({length: 50,})
    user_create: string;

    @Column({length: 50,})
    user_update: string;

    @Column({length: 50,})
    created_at: string;

    @Column({length: 50,})
    updated_at: string;

    @Column({length: 50,})
    deleted_at: string;
}
