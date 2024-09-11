import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Picture {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({length: 50,})
    picture: string;

    @Column({length: 1,})
    status: string;

    @Column({default:null})
    id_user: number;

    @Column({length: 11,})
    CPF_collaborator: string;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
