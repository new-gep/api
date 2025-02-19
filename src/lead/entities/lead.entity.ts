import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Lead {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    email: string;

    @Column()
    phone: string;

    @Column()
    role: string;
    
    @Column()
    create_at: string;

    @Column({default: null})
    deleted_at: string;
    
}
