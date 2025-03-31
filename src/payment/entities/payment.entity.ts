import { Json } from 'aws-sdk/clients/robomaker';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Payment {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({length: 200})
    cel_cash_id: string;

    @Column({length: 14})
    CNPJ_Company: string;

    @Column({length: 50})
    method: string;

    @Column({length: 50})
    status: string;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
