import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UserType {
    @PrimaryGeneratedColumn()
    id_user: number;

    @Column({length: 50})
    function: string;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
