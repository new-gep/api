import { Json } from 'aws-sdk/clients/robomaker';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Absence {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({length: 50})
    name: string;

    @Column({length: 50})
    status: string;

    @Column({length: 120})
    observation: string;

    @Column({length: 11})
    CPF_collaborator: string;

    @Column()
    id_work: number;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
