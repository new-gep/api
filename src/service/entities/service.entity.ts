import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Service {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({length: 50})
    name: string;

    @Column({length: 50})
    type: string;

    @Column({length: 50})
    status: string;

    @Column()
    id_work: number;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
    
}
