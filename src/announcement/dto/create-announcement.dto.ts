export class CreateAnnouncementDto {
  CPF_creator: any;
  category: string;
  title: string;
  typePayment: string;
  typeAnnouncement: string;
  included: string;
  salary?: string;
  notIncluded?: string;
  information?: string;
  model  : string;
  street : string;
  complement : string;
  number : string;
  city   : string;
  district : string;
  state : string;
  cep : string;
  create_at:string;
}
