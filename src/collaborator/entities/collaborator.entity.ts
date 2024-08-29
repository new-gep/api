import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Collaborator {
    @PrimaryGeneratedColumn()
    CPF: string;

    @Column({length: 150,})
    name: string;

    @Column({length: 50, })
    password: string;

    @Column({length: 200,})
    email: string;

    @Column({length: 1   })
    terms: string;

    @Column({length: 14, default:null})
    CNPJ_client: string;

    @Column({length: 14, default:null})
    CNPJ_company: string;

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

    @Column()
    number: number;

    @Column({length: 50})
    create_at: string;

    @Column({length: 50, default:null })
    update_at: string;

    @Column({length: 50, default:null })
    delete_at: string;
}
