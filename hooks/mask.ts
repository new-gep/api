
export default function Mask(type : any, value : any){
    switch (type) {
        case "fileName":
            const nameEdit = value.toLowerCase().split(" ");
            const nomeFormatado = nameEdit
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("");
            return nomeFormatado;
        case "cnpj":
            return value.replace(
                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                "$1.$2.$3/$4-$5"
            );
        case "date":
            return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3/$2/$1");
        case "formatDate":
            let formatDate  = new Date(value);
            let formatDay   = String(formatDate.getDate()).padStart(2, '0');
            let formatMonth = String(formatDate.getMonth() + 1).padStart(2, '0'); 
            let formatYear  = formatDate.getFullYear();
            return `${formatDay}/${formatMonth}/${formatYear}`;
        case "cep":
            return value.replace(/^(\d{5})(\d{3})$/, "$1-$2");
        case 'phone':
            const cleanedValue = value.replace(/\D/g, '');
            let maskedValue = '';
            if (cleanedValue.length < 11) {
                // Máscara para números de telefone com 10 dígitos (xx) xxxx-xxxx
                maskedValue = cleanedValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            } else {
                // Máscara para números de telefone com 11 dígitos (xx) xxxxx-xxxx
                maskedValue = cleanedValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            }
            return maskedValue;
        case 'amount':
            const formattedAmount = (value / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              });
              console.log(formattedAmount)
            return formattedAmount;
        case 'cpf':
            // Máscara para CPF: xxx.xxx.xxx-xx
            return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        case 'firstName':
            // Corta o primeiro nome
            const  firstName = value.split(' ')[0];
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        case 'secondName':
            // Retorna o restante do nome (segundo nome)
            return value.split(' ').slice(1).join(' ');
        case 'day':
            // Retorna o dia da data
            return new Date(value).getDate();
        case 'month':
            // Retorna o mês da data
            return new Date(value).getMonth() + 1;
        case 'year':
            // Retorna o ano da data
            return new Date(value).getFullYear();
        case 'remove':
            return value.replace(/\D/g, '');
        case 'amountHidden':
            const amount = (value / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              });
            return amount.replace(/\d/g, '*');
        case 'capitalize':
            if(!value){
                return value
            }
            return value.toLowerCase().replace(/(^|\s)\S/g, function(char) {
            return char.toUpperCase();
            });
        case 'age':
            const dataAtual = new Date();
            const anoAtual = dataAtual.getFullYear();
            const mesAtual = dataAtual.getMonth() + 1;
            const diaAtual = dataAtual.getDate();
        
            const partesData = value.split('/');
            const diaNascimento = parseInt(partesData[0], 10);
            const mesNascimento = parseInt(partesData[1], 10);
            const anoNascimento = parseInt(partesData[2], 10);
        
            let idade = anoAtual - anoNascimento;
        
            if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
                idade--;
            }
        
            return idade;
        case 'adminName':
            let index = value.indexOf('@');
            let name = value.substring(0, index);
            if(name == ''){
                return value
            }
            return name
        case 'percentage':
            const percentage = value.replace(/[^0-9]/g, '')
            return `${percentage}`;
        case 'km':
            const km = parseFloat(value)
            const  formattedNumber = km.toFixed(2);
            return formattedNumber
        case 'create':
            if(value == null){
                return false
            }
            let date = new Date(value);
            let hours = date.getUTCHours().toString().padStart(2, '0');
            let minutes = date.getUTCMinutes().toString().padStart(2, '0');
            let day = date.getUTCDate().toString().padStart(2, '0');
            let month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
            let year = date.getUTCFullYear();
        
            return `${hours}:${minutes} de ${day}/${month}/${year}`;
        case 'hoursAndMin':
                if(value == null){
                    return false
                }
                let datee = new Date(value);
                let hourss = datee.getUTCHours().toString().padStart(2, '0');
                let minutess = datee.getUTCMinutes().toString().padStart(2, '0');
            
                return `${hourss}:${minutess}`;
        default:
        return value;
    }
}
