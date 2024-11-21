import { Json } from 'aws-sdk/clients/robomaker';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Job {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({length: 50})
    image: string;

    @Column({length: 50})
    function: string;

    @Column({length: 50})
    salary: string;

    @Column()
    time: Json;

    @Column()
    candidates: string;

    @Column({length: 1})
    transportation_voucher: string;

    @Column({length: 20})
    contract: string;

    @Column({length: 255})
    details: string;

    @Column({length: 255})
    obligations: string;

    @Column({length: 255})
    benefits: string;

    @Column({length: 14})
    CNPJ_company: string;

    @Column({length: 11})
    CPF_collaborator: string;

    @Column({length: 5})
    user_create: string;

    @Column({length: 5})
    user_edit: string;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
