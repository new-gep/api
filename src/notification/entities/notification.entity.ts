import { Collaborator } from "src/collaborator/entities/collaborator.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Collaborator, collaborator => collaborator.CPF)
    @JoinColumn({ name: 'CPF_collaborator' })
    CPF_collaborator: Collaborator;

    @Column({length: 100})
    title: string;

    @Column({length: 250})
    body: string;

    @Column({default:null})
    image: string;

    @Column({length: 50})
    create_at: string;
    
    @Column({length: 50, default:null })
    update_at: string;
    
    @Column({length: 50, default:null })
    delete_at: string;
}
