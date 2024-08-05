import { Provable } from 'o1js';
import v8 from 'v8';
import { Sp1PlonkVerifier } from './verifier.js';
import { VK } from './vk.js';
import fs from "fs"
import { FrC } from '../towers/fr.js';
import { Sp1PlonkProof, deserializeProof } from './proof.js';
import { parsePublicInputs } from './parse_pi.js';
import { AuXWitness } from './aux_witness.js';

const hexProof = "0x000000002404cf191225999c4c7da38d34eb83b230cf8d9f75012ff67e4af9f9b48a7b6c2e1860dddf9ab7cb6c2233e0d062b5ea7af28a383d812703002942d4083b6d3b0c86e040710021a891d9f690653ee5c082e63be3aecd686bc2f1efe08090aee02e1d9683273cbf48a87f66fba5015dea8176640eb57f6bc6f11487254486eee82de4747d5fa4d228f98762bb3007fd730803d7305027fa40958fe631c81f99bf293aa5ca94dfffd823fb4f8c9d57cc3cf68d80247473f35117b888738a0120cc043837bc770e475b66fce6c980bd652cfeee737a76672d7638b31e8f3ed7a7d921555c2c88da874a9d3eac6258cee2d2c053dd197bbd1e9ffa1c279300fcdedc06440bdd27ef636ed8e3f6d0d8d1f3b91f06e366f52ff76fda6b44dbada1e4bb1b46662af7b7f399644d26fdb4b873fbde5f5e1710461d21858e594b564184d82b533736ea34b33ee6a88c6ff9b46cd746922a2414a34552608da6c31cf903af0406ff031ac707ffd9cad4f92cc17ab8984afa34de369dd1d54e69a57db842af0c08494101b2218d8648af567262d61daf9d138156436cbc317ae8b6210ac3e4022efcde431da6f56eb7bcc88dd8d73f9a1ad7d6b69f04c6ef8d2310dacc28d7150b6c86baf87150ac11911da3a1546a4fa2f6aa7808070fa007d3b8b50ecb4e2c43b3f10e711977fe7d35bdb6f8c9094f98334b775b1b24d85e2541a3a827b60d717f7c8abd9eef2ca0422122d73c4da84e9b71da3f868193cb224e13f4dc61135ec8207fa30eb45bfadb8004baebd6930aa7a0e934048e945a560567a534a9138502434a91e7e78aaa406d2738108ae2a30c913712303553912eedb9f413d524fdbf94339bd828140c9434640dcec41ae63395c31881b1459be6e5f6a9ed6e2b741be2a14a5652a3a713120e9877bfafe379b5e1246b536ea0d0049ba035a327538aab690e5be8b61aea4ee585df94352c32d089a35c3e1bb9339844d7d1f826de8928955019b2d054945ee77122130a209829512a3fd2734d05a44c24dd630269e3c6b69f90fc9c5cd7029f3f98286fa602dd23e5e13761dd1112dd4545aa1b17090aa9001d696059e2d4fd31582cbeabb488c9ea9a7ece2c31486571d308004694dd5ca02b81f9122d1ea48b7d5ceb33361a94f0c4b6068bc2de489b9bc41c08e46482400a3f1978f9e65a39effcd0377014a67b3fe6d290ffb368b5a5c7"
const programVk = "411326016333083790673186923851565072293900140718044763953682148611442105839";
const piHex = "0x1d0000000000000000000000000000000000000000000000000000000000000019352000002000000000000000736f6d65206461746120746f2073746f7265206f6e20626c6f636b636861696e9388fe7538e3ee24a72d29fe0731783ad1aafbfd2351fb9b13f589dc955ad959";

const auxWtnsJSON = {"c":{"g00":"16877928702995110459825381678667141446343770165699834239672129803178206560244","g01":"3994136334084286870417961709064226858582558470398359146509463630465195485708","g10":"19697642759990964934380263067007813049199891506977258747252024609039764004545","g11":"1040794857361079414973339884131873921808008448293351530177620439076278225019","g20":"12680262116432159411546062209454515771134789426408825956623488819972624616432","g21":"779927106073973831864189409037941383054461651239215698846749832176305478893","h00":"6739461702276563112833600744029596453942764585091852591688715237228118416211","h01":"6901539832253222823144353218343968833933723857756305700327326154601904128828","h10":"14759073072578514019463814688269218572901196531607680873572624906611272215281","h11":"2384621656748304243786569284127822474355630258959105583670392745020801352101","h20":"18302838250643249125248474920238147724896375005165299904070200261956967108494","h21":"20907496674021743587583315884174564544556374839401059424105493289730399716300"},"shift_power":"0"}
const auxWitness = AuXWitness.loadFromJSON(auxWtnsJSON)

const g2_lines = fs.readFileSync(`./src/plonk/mm_loop/g2_lines.json`, 'utf8');
const tau_lines = fs.readFileSync(`./src/plonk/mm_loop/tau_lines.json`, 'utf8');

const Verifier = new Sp1PlonkVerifier(VK, g2_lines, tau_lines)

function main() {
    const [pi0, pi1] = Provable.witness(Provable.Array(FrC.provable, 2), () => parsePublicInputs(programVk, piHex));
    const proof = Provable.witness(Sp1PlonkProof, () => new Sp1PlonkProof(deserializeProof(hexProof)))

    Verifier.verify(proof, pi0, pi1, auxWitness);
}

// npm run build && node --max-old-space-size=65536 build/src/plonk/e2e_test.js
(async () => {
    console.time('running Fp constant version');
    main();
    console.timeEnd('running Fp constant version');

    console.time('running Fp witness generation & checks');
    await Provable.runAndCheck(main);
    console.timeEnd('running Fp witness generation & checks');

    console.time('creating Fp constraint system');
    let cs = await Provable.constraintSystem(main);
    console.timeEnd('creating Fp constraint system');

    console.log(cs.summary());
    const totalHeapSize = v8.getHeapStatistics().total_available_size;
    let totalHeapSizeinGB = (totalHeapSize / 1024 / 1024 / 1024).toFixed(2);
    console.log(`Total heap size: ${totalHeapSizeinGB} GB`);

    // used_heap_size
    const usedHeapSize = v8.getHeapStatistics().used_heap_size;
    let usedHeapSizeinGB = (usedHeapSize / 1024 / 1024 / 1024).toFixed(2);
    console.log(`Used heap size: ${usedHeapSizeinGB} GB`);
})();
