import { Year } from 'aws-sdk/clients/groundstation';
import { Job } from 'src/job/entities/job.entity';
import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class Collaborator {
    @Column({length: 11, primary: true})
    CPF: string;

    @Column({length: 150,})
    name: string;

    @Column({length: 255, default: null})
    push_token: string;

    @ManyToOne(() => Job, job => job.id)
    @JoinColumn({ name: 'id_work' })
    id_work: Job;

    @Column({length: 1, default: null})
    sex: string;

    @Column({length: 1, default: null})
    PCD: string;

    @Column({length: 200, })
    password: string;

    @Column({length: 200,})
    email: string;

    @Column({length: 11,})
    phone: string;

    @Column({default: null})
    birth: Date;

    @Column({length: 1 })
    terms: string;

    @Column({length: 1, default: null})
    marriage: string;

    @Column({ type: 'json', nullable: true }) 
    children: {
        [key: string]: {
            name: string;
            birth: string;
        };
    } | 0;

    @Column({length: 8, default:null})
    zip_code: string;

    @Column({length: 200, default:null})
    street: string;

    @Column({length: 150, default:null})
    district: string;

    @Column({length: 100, default:null})
    city: string;

    @Column({length: 2, default:null})
    uf: string;

    @Column({length: 50, default:null})
    complement: string;

    @Column({length: 50, default:null})
    number: string;

    @Column({length: 200, default:null})
    presentation: string;

    @Column({ type: 'json', nullable: true })
    about: any;

    @Column({ type: 'json', nullable: true })
    howWork: any;

    @Column({ type: 'json', nullable: true })
    service: any;

    @Column({ type: 'json', nullable: true })
    social: any;

    @Column({ type: 'longtext', nullable: true })
    favorite: any;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
