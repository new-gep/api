import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 50})
    user: string;

    @Column({length: 50})
    password: string;

    @Column({length: 200})
    email: string;

    @Column({length: 11})
    phone: string;

    @Column({length: 14})
    CNPJ_client: string;

    @Column({length: 14})
    CNPJ_company: string;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
