export default function findTimeSP(){
    const agora = new Date();
    const horarioBrasilia = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
    return horarioBrasilia.toISOString();
    
}