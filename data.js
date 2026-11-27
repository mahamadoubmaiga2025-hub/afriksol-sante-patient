/* AfrikSol Santé — données de démonstration (Burkina Faso)
   Numéros d'urgence : SAMU 15, Police 17, Sapeurs-pompiers 18, Gendarmerie 16 (cahier des charges Burkina Faso v1.0).
   Téléphones des hôpitaux et cliniques : numéros de démonstration (annuaires publics de Ouagadougou),
   à vérifier avant toute démonstration publique.
   Patients, médecins, dossiers, stocks, prix et assurance : données FICTIVES pour la démonstration. */
window.DATA = (function(){
  const SAMU_DIRECT = '+22625306888';

  /* ---------- Établissements avec urgences (Ouagadougou) ---------- */
  const ER_HOSPITALS = [
    {id:'cnhu', name:'CHU Yalgado Ouédraogo — Urgences', area:'Secteur 4, Ouagadougou', tel:'+22625306888', telLabel:'25 30 68 88', lat:12.3597, lng:-1.5236, type:'pub', h24:true},
    {id:'mel', name:'CHU Pédiatrique Charles de Gaulle', area:'Paspanga, Ouagadougou', tel:'+22625314060', telLabel:'25 31 40 60', lat:12.3789, lng:-1.4933, type:'pub', h24:true},
    {id:'cocotiers', name:'CHU de Tengandogo', area:'Ouaga 2000, Ouagadougou', tel:'+22625471900', telLabel:'25 47 19 00', lat:12.3067, lng:-1.4967, type:'pub', h24:true},
    {id:'mahouna', name:'CHU Bogodogo', area:'Bogodogo, Ouagadougou', tel:'+22625378800', telLabel:'25 37 88 00', lat:12.3283, lng:-1.4883, type:'pub', h24:true},
    {id:'atinkanmey', name:'Hôpital Saint-Camille', area:'Centre-ville, Ouagadougou', tel:'+22625346116', telLabel:'25 34 61 16', lat:12.3686, lng:-1.5253, type:'priv', h24:true},
    {id:'posam', name:'Polyclinique Notre Dame de la Paix', area:'Koulouba, Ouagadougou', tel:'+22625300011', telLabel:'25 30 00 11', lat:12.3750, lng:-1.5150, type:'priv', h24:true},
    {id:'serena', name:'Clinique El Fateh', area:'Zone du Bois, Ouagadougou', tel:'+22625361212', telLabel:'25 36 12 12', lat:12.3710, lng:-1.4780, type:'priv', h24:true},
    {id:'sevi', name:'Clinique Saint-Jean', area:'Dassasgho, Ouagadougou', tel:'+22625374040', telLabel:'25 37 40 40', lat:12.3520, lng:-1.4700, type:'priv', h24:true},
    {id:'hagnon', name:'Clinique du Cœur', area:'Patte d\'Oie, Ouagadougou', tel:'+22625388989', telLabel:'25 38 89 89', lat:12.3350, lng:-1.5050, type:'priv', h24:true}
  ];
  const OUAGA = {lat:12.3714, lng:-1.5197};

  const FACILITY_TYPES = [
    {id:'pub', icon:'building', fee:2000},
    {id:'clin', icon:'hospital', fee:10000},
    {id:'cab', icon:'stetho', fee:7000}
  ];
  const FACILITIES = {
    pub:[
      {id:'cnhu', name:'CHU Yalgado Ouédraogo', area:'Secteur 4 · Ouagadougou', km:2.1, docs:6},
      {id:'mel', name:'CHU Pédiatrique Charles de Gaulle', area:'Paspanga · Ouagadougou', km:1.4, docs:5},
      {id:'cocotiers', name:'CHU de Tengandogo', area:'Ouaga 2000 · Ouagadougou', km:7.6, docs:6},
      {id:'mahouna', name:'CHU Bogodogo', area:'Bogodogo · Ouagadougou', km:5.9, docs:5},
      {id:'suru', name:'Hôpital de district de Boulmiougou', area:'Boulmiougou · Ouagadougou', km:3.6, docs:4},
      {id:'akpakpa', name:'CSPS de Karpala', area:'Karpala · Ouagadougou', km:4.2, docs:3},
      {id:'calavi', name:'Hôpital de district de Pissy', area:'Pissy · Ouagadougou', km:12.8, docs:4},
      {id:'chudop', name:'CHR de Koudougou', area:'Koudougou', km:31.5, docs:5},
      {id:'chudb', name:'CHU Sourô Sanou', area:'Bobo-Dioulasso', km:415, docs:5}
    ],
    clin:[
      {id:'atinkanmey', name:'Hôpital Saint-Camille', area:'Centre-ville · Ouagadougou', km:0.7, docs:4},
      {id:'posam', name:'Polyclinique Notre Dame de la Paix', area:'Koulouba · Ouagadougou', km:0.6, docs:5},
      {id:'serena', name:'Clinique El Fateh', area:'Zone du Bois · Ouagadougou', km:4.5, docs:5},
      {id:'sevi', name:'Clinique Saint-Jean', area:'Dassasgho · Ouagadougou', km:5.8, docs:4},
      {id:'hagnon', name:'Clinique du Cœur', area:'Patte d\'Oie · Ouagadougou', km:4.3, docs:3}
    ],
    cab:[
      {id:'cab1', name:'Cabinet médical de Wemtenga', area:'Wemtenga · Ouagadougou', km:1.9, docs:2},
      {id:'cab2', name:'Cabinet médical de Dassasgho', area:'Dassasgho · Ouagadougou', km:6.1, docs:2},
      {id:'cab3', name:'Cabinet médical de Karpala', area:'Karpala · Ouagadougou', km:9.4, docs:2}
    ]
  };
  const SPECIALTIES = ['gen','ped','gyn','rad','card','surg','oph','derm','ent','dent'];

  const FIRST = ['Seydou','Aïcha','Awa','Boureima','Fatou','Mariam','Rasmane','Salif','Kadidiatou','Ousmane','Aminata','Issouf','Nafissatou','Harouna','Prudence','Ibrahim','Zenabo','Lassina','Bintou','Abdoulaye'];
  const LAST = ['Ouédraogo','Traoré','Sawadogo','Kaboré','Diallo','Barry','Sankara','Zongo','Compaoré','Nikièma','Ilboudo','Tapsoba','Ouattara','Sanou','Kiemdé','Yaméogo','Bancé','Nikiema'];
  function hash(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h}
  function doctorsFor(fac, spec){
    const n = 3 + (hash(fac+spec)%2), out=[];
    for(let i=0;i<n;i++){
      const h=hash(fac+spec+i), fn=FIRST[h%FIRST.length], ln=LAST[(h>>>5)%LAST.length];
      out.push({id:fac+'-'+spec+'-'+i, name:'Dr '+fn+' '+ln, ini:(fn[0]+ln[0]).toUpperCase(), rating:(4.4+(hash(fac+spec+i+'r')%6)/10).toFixed(1), reviews:12+hash(fac+spec+i+'v')%80, exp:4+hash(fac+spec+i+'e')%22});
    }
    return out;
  }

  /* ---------- Famille (fictive) ---------- */
  const PROFILES = [
    {id:'me', first:'Aïcha', last:'Ouédraogo', num:'BF 0042 1187 5530', born:'1992-03-14', sex:'F', blood:'O+', city:'Ouagadougou', photo:null, child:false,
      allergy:{fr:'Pénicilline',en:'Penicillin',ar:'البنسلين'}, contact:{name:'Boureima Ouédraogo', rel:'brother', tel:'70 00 00 00'}, issued:'02/11/2026', expires:'02/11/2036'},
    {id:'kevin', first:'Kévin', last:'Ouédraogo', num:'BF 0042 1187 5548', born:'2020-06-02', sex:'M', blood:'O+', city:'Ouagadougou', photo:'assets/child-kevin.jpg', child:true, ownLogin:false,
      allergy:null, issued:'02/11/2026', expires:'02/11/2031'},
    {id:'grace', first:'Grâce', last:'Ouédraogo', num:'BF 0042 1187 5556', born:'2022-01-19', sex:'F', blood:'A+', city:'Ouagadougou', photo:null, child:true, ownLogin:false,
      allergy:{fr:'Arachide',en:'Peanut',ar:'الفول السوداني'}, issued:'02/11/2026', expires:'02/11/2031'},
    {id:'mahoutin', first:'Abdoul', last:'Ouédraogo', num:'BF 0042 1187 5563', born:'2010-04-05', sex:'M', blood:'O+', city:'Ouagadougou', photo:null, child:true, ownLogin:true,
      allergy:null, issued:'02/11/2026', expires:'05/04/2028'}
  ];
  const GUARDIAN = {name:'Aïcha Ouédraogo', tel:'70 52 00 02'};

  /* ---------- Rubriques du dossier ---------- */
  const RECORD = [
    {id:'appts', icon:'calendar'}, {id:'labs', icon:'flask'}, {id:'imaging', icon:'scan'}, {id:'doctors', icon:'users'},
    {id:'bills', icon:'receipt'}, {id:'orders', icon:'file'}, {id:'rx', icon:'pill'}, {id:'treat', icon:'pulse'},
    {id:'vacc', icon:'syringe'}, {id:'allergy', icon:'alert'}, {id:'reports', icon:'clipboard'}, {id:'monthly', icon:'trend'},
    {id:'vitals', icon:'heart'}, {id:'history', icon:'book'}, {id:'family', icon:'users2'}, {id:'hosp', icon:'bed'},
    {id:'surgery', icon:'scissors'}, {id:'blood', icon:'drop'}, {id:'chronic', icon:'activity'}, {id:'certs', icon:'award'},
    {id:'contacts', icon:'phone'}, {id:'insurance', icon:'shield'}, {id:'docs', icon:'folder'}
  ];
  const OK = {fr:'Normal',en:'Normal',ar:'طبيعي'}, UTD = {fr:'À jour',en:'Up to date',ar:'محدّث'}, DONE={fr:'Terminé',en:'Completed',ar:'مكتمل'},
        ONG={fr:'En cours',en:'Ongoing',ar:'جارٍ'}, ARCH={fr:'Archivé',en:'Archived',ar:'مؤرشف'}, PAID={fr:'Payé',en:'Paid',ar:'مدفوع'};

  const RECORDS = {
    me:{
      labs:[
        {t:{fr:'Goutte épaisse / TDR paludisme',en:'Malaria thick smear / RDT',ar:'فحص الملاريا السريع'}, s:{fr:'CHU Yalgado · 12 oct. 2026 · Résultat : négatif',en:'CHU Yalgado · 12 Oct 2026 · Result: negative',ar:'CHU Yalgado · 12 أكتوبر 2026 · النتيجة: سلبية'}, b:['green',OK]},
        {t:{fr:'Numération formule sanguine (NFS)',en:'Complete blood count (CBC)',ar:'تعداد الدم الكامل'}, s:{fr:'CHU Yalgado · 12 oct. 2026 · Hémoglobine 12,1 g/dL',en:'CHU Yalgado · 12 Oct 2026 · Haemoglobin 12.1 g/dL',ar:'CHU Yalgado · 12 أكتوبر 2026 · الهيموغلوبين 12.1 غ/دل'}, b:['orange',{fr:'À revoir',en:'To review',ar:'للمراجعة'}]},
        {t:{fr:'Glycémie à jeun',en:'Fasting blood glucose',ar:'سكر الدم الصائم'}, s:{fr:'Hôpital Saint-Camille · 3 août 2026 · 0,92 g/L',en:'Hôpital Saint-Camille · 3 Aug 2026 · 0.92 g/L',ar:'Hôpital Saint-Camille · 3 أغسطس 2026 · 0.92 غ/ل'}, b:['green',OK]}
      ],
      imaging:[
        {t:{fr:'Radiographie thoracique',en:'Chest X-ray',ar:'أشعة الصدر'}, s:{fr:'CHU Yalgado · 20 mai 2026 · Pas d\'anomalie',en:'CHU Yalgado · 20 May 2026 · No abnormality',ar:'CHU Yalgado · 20 مايو 2026 · لا شيء غير طبيعي'}, b:['green',OK]},
        {t:{fr:'Échographie abdominale',en:'Abdominal ultrasound',ar:'تصوير البطن بالموجات فوق الصوتية'}, s:{fr:'Polyclinique Notre Dame de la Paix · 2 févr. 2026',en:'Polyclinique Notre Dame de la Paix · 2 Feb 2026',ar:'Polyclinique Notre Dame de la Paix · 2 فبراير 2026'}, b:['gray',ARCH]}
      ],
      doctors:[
        {t:{fr:'Dr Seydou Ouédraogo',en:'Dr Seydou Ouédraogo',ar:'د. سيدو ويدراوغو'}, s:{fr:'Médecine générale · CHU Yalgado · Médecin traitant',en:'General medicine · CHU Yalgado · Primary doctor',ar:'طب عام · CHU Yalgado · الطبيب المعالج'}, b:['red',{fr:'Traitant',en:'Primary',ar:'معالج'}]},
        {t:{fr:'Dr Awa Traoré',en:'Dr Awa Traoré',ar:'د. آوا تراوري'}, s:{fr:'Gynécologie-Obstétrique · CHUP-CDG',en:'Obstetrics & Gynaecology · CHUP-CDG',ar:'أمراض النساء والتوليد · CHUP-CDG'}}
      ],
      bills:[
        {t:{fr:'Consultation — CHU Yalgado',en:'Consultation — CHU Yalgado',ar:'استشارة — CHU Yalgado'}, s:{fr:'12 oct. 2026 · 2 000 FCFA · Orange Money',en:'12 Oct 2026 · 2,000 FCFA · Orange Money',ar:'12 أكتوبر 2026 · 2000 فرنك · Orange Money'}, b:['green',PAID]},
        {t:{fr:'Analyses — CHU Yalgado',en:'Lab tests — CHU Yalgado',ar:'تحاليل — CHU Yalgado'}, s:{fr:'12 oct. 2026 · 6 500 FCFA · Pris en charge RAMU',en:'12 Oct 2026 · 6,500 FCFA · Covered by RAMU',ar:'12 أكتوبر 2026 · 6500 فرنك · بتغطية RAMU'}, b:['blue',{fr:'RAMU',en:'RAMU',ar:'RAMU'}]}
      ],
      orders:[
        {t:{fr:'Bon d\'examen — Bilan lipidique',en:'Test order — Lipid panel',ar:'طلب فحص — دهون الدم'}, s:{fr:'Prescrit par Dr Seydou Ouédraogo · valable jusqu\'au 30 nov. 2026',en:'Prescribed by Dr Seydou Ouédraogo · valid until 30 Nov 2026',ar:'بوصفة د. سيدو ويدراوغو · صالح حتى 30 نوفمبر 2026'}, b:['orange',{fr:'À faire',en:'Pending',ar:'معلّق'}]}
      ],
      rx:[
        {t:{fr:'Artéméther + Luméfantrine 80/480',en:'Artemether + Lumefantrine 80/480',ar:'أرتيميثر + لوميفانترين 80/480'}, s:{fr:'1 cp matin et soir pendant 3 jours · 12 oct. 2026',en:'1 tab morning and evening for 3 days · 12 Oct 2026',ar:'قرص صباحًا ومساءً لمدة 3 أيام · 12 أكتوبر 2026'}, b:['green',DONE]},
        {t:{fr:'Fer + Acide folique',en:'Iron + Folic acid',ar:'حديد + حمض الفوليك'}, s:{fr:'1 cp par jour pendant 1 mois',en:'1 tab daily for 1 month',ar:'قرص يوميًا لمدة شهر'}, b:['orange',ONG]}
      ],
      treat:[
        {t:{fr:'Supplémentation en fer',en:'Iron supplementation',ar:'مكمّل الحديد'}, s:{fr:'Depuis le 12 oct. 2026 · fin prévue le 12 nov. 2026',en:'Since 12 Oct 2026 · ends 12 Nov 2026',ar:'منذ 12 أكتوبر 2026 · ينتهي 12 نوفمبر 2026'}, b:['orange',ONG]}
      ],
      vacc:[
        {t:{fr:'Fièvre jaune',en:'Yellow fever',ar:'الحمى الصفراء'}, s:{fr:'Valable à vie · 4 mars 2019',en:'Valid for life · 4 Mar 2019',ar:'صالح مدى الحياة · 4 مارس 2019'}, b:['green',UTD]},
        {t:{fr:'Tétanos-diphtérie (Td)',en:'Tetanus-diphtheria (Td)',ar:'الكزاز والخناق'}, s:{fr:'Rappel prévu en janvier 2027',en:'Booster due January 2027',ar:'جرعة معززة في يناير 2027'}, b:['orange',{fr:'Rappel bientôt',en:'Booster soon',ar:'جرعة قريبًا'}]},
        {t:{fr:'Hépatite B',en:'Hepatitis B',ar:'التهاب الكبد ب'}, s:{fr:'3 doses · 2021',en:'3 doses · 2021',ar:'3 جرعات · 2021'}, b:['green',UTD]}
      ],
      allergy:[
        {t:{fr:'Pénicilline',en:'Penicillin',ar:'البنسلين'}, s:{fr:'Éruption cutanée · signalée en 2022',en:'Skin rash · reported 2022',ar:'طفح جلدي · مُبلَّغ عنه في 2022'}, b:['red',{fr:'Allergie',en:'Allergy',ar:'حساسية'}]}
      ],
      reports:[
        {t:{fr:'Compte rendu de consultation',en:'Consultation report',ar:'تقرير الاستشارة'}, s:{fr:'Dr Seydou Ouédraogo · 12 oct. 2026 · Accès palustre simple traité',en:'Dr Seydou Ouédraogo · 12 Oct 2026 · Uncomplicated malaria treated',ar:'د. سيدو ويدراوغو · 12 أكتوبر 2026 · علاج ملاريا بسيطة'}}
      ],
      vitals:[
        {t:{fr:'Tension artérielle',en:'Blood pressure',ar:'ضغط الدم'}, s:{fr:'12/8 · 12 oct. 2026',en:'120/80 · 12 Oct 2026',ar:'120/80 · 12 أكتوبر 2026'}, b:['green',OK]},
        {t:{fr:'Poids · Taille',en:'Weight · Height',ar:'الوزن · الطول'}, s:{fr:'64 kg · 1,68 m · IMC 22,7',en:'64 kg · 1.68 m · BMI 22.7',ar:'64 كغ · 1.68 م · مؤشر الكتلة 22.7'}}
      ],
      history:[
        {t:{fr:'Paludisme (accès simple)',en:'Malaria (uncomplicated)',ar:'ملاريا بسيطة'}, s:{fr:'2023, 2026',en:'2023, 2026',ar:'2023، 2026'}},
        {t:{fr:'Fièvre typhoïde',en:'Typhoid fever',ar:'حمى التيفوئيد'}, s:{fr:'2020 · guérie',en:'2020 · recovered',ar:'2020 · شُفيت'}}
      ],
      family:[
        {t:{fr:'Hypertension artérielle',en:'High blood pressure',ar:'ارتفاع ضغط الدم'}, s:{fr:'Père',en:'Father',ar:'الأب'}},
        {t:{fr:'Diabète de type 2',en:'Type 2 diabetes',ar:'السكري من النوع 2'}, s:{fr:'Mère',en:'Mother',ar:'الأم'}}
      ],
      hosp:[
        {t:{fr:'Hospitalisation — Médecine interne',en:'Admission — Internal medicine',ar:'دخول المستشفى — الطب الباطني'}, s:{fr:'CHU Yalgado · 3 jours · juin 2023',en:'CHU Yalgado · 3 days · June 2023',ar:'CHU Yalgado · 3 أيام · يونيو 2023'}}
      ],
      surgery:[{t:{fr:'Aucune intervention enregistrée',en:'No surgery recorded',ar:'لا توجد عمليات مسجلة'}}],
      blood:[{t:{fr:'Groupe sanguin O+',en:'Blood group O+',ar:'فصيلة الدم O+'}, s:{fr:'Vérifié au CHU Yalgado · 2023',en:'Verified at CHU Yalgado · 2023',ar:'تم التحقق في CHU Yalgado · 2023'}, b:['red',{fr:'O+',en:'O+',ar:'O+'}]}],
      chronic:[{t:{fr:'Aucune maladie chronique déclarée',en:'No chronic disease declared',ar:'لا أمراض مزمنة مصرّح بها'}}],
      certs:[{t:{fr:'Certificat médical d\'aptitude',en:'Medical fitness certificate',ar:'شهادة لياقة طبية'}, s:{fr:'Dr Seydou Ouédraogo · 5 sept. 2026',en:'Dr Seydou Ouédraogo · 5 Sep 2026',ar:'د. سيدو ويدراوغو · 5 سبتمبر 2026'}}],
      contacts:[{t:{fr:'Boureima Ouédraogo (frère)',en:'Boureima Ouédraogo (brother)',ar:'بوريما ويدراوغو (أخ)'}, s:{fr:'70 00 00 00',en:'70 00 00 00',ar:'70 00 00 00'}, b:['red',{fr:'Principal',en:'Main',ar:'رئيسي'}]}],
      docs:[{t:{fr:'Carte nationale de santé',en:'National health card',ar:'البطاقة الصحية الوطنية'}, s:{fr:'BF 0042 1187 5530 · Délivrée le 2 nov. 2026',en:'BF 0042 1187 5530 · Issued 2 Nov 2026',ar:'BF 0042 1187 5530 · صدرت في 2 نوفمبر 2026'}}]
    },
    kevin:{
      labs:[{t:{fr:'TDR paludisme',en:'Malaria RDT',ar:'فحص الملاريا السريع'}, s:{fr:'CHUP-CDG · 28 sept. 2026 · Résultat : négatif',en:'CHUP-CDG · 28 Sep 2026 · Result: negative',ar:'CHUP-CDG · 28 سبتمبر 2026 · النتيجة: سلبية'}, b:['green',OK]}],
      doctors:[{t:{fr:'Dr Aminata Sawadogo',en:'Dr Aminata Sawadogo',ar:'د. أميناتا ساوادوغو'}, s:{fr:'Pédiatrie · CHUP-CDG · Pédiatre référente',en:'Paediatrics · CHUP-CDG · Lead paediatrician',ar:'طب الأطفال · CHUP-CDG · طبيبة الأطفال المرجعية'}, b:['red',{fr:'Pédiatre',en:'Paediatrician',ar:'طبيبة أطفال'}]}],
      rx:[{t:{fr:'Paracétamol sirop 120 mg/5 ml',en:'Paracetamol syrup 120 mg/5 ml',ar:'شراب باراسيتامول 120 ملغ/5 مل'}, s:{fr:'Selon le poids, si fièvre · prescrit le 28 sept. 2026',en:'By weight, if fever · prescribed 28 Sep 2026',ar:'حسب الوزن عند الحمى · وُصف في 28 سبتمبر 2026'}, b:['blue',{fr:'Si besoin',en:'As needed',ar:'عند الحاجة'}]}],
      vacc:[
        {t:{fr:'BCG',en:'BCG',ar:'لقاح السل'}, s:{fr:'À la naissance · juin 2020',en:'At birth · June 2020',ar:'عند الولادة · يونيو 2020'}, b:['green',UTD]},
        {t:{fr:'Pentavalent (3 doses)',en:'Pentavalent (3 doses)',ar:'اللقاح الخماسي (3 جرعات)'}, s:{fr:'6, 10 et 14 semaines · 2020',en:'6, 10 and 14 weeks · 2020',ar:'6 و10 و14 أسبوعًا · 2020'}, b:['green',UTD]},
        {t:{fr:'Rougeole-Rubéole (2 doses)',en:'Measles-rubella (2 doses)',ar:'الحصبة والحصبة الألمانية (جرعتان)'}, s:{fr:'9 et 15 mois · 2021',en:'9 and 15 months · 2021',ar:'9 و15 شهرًا · 2021'}, b:['green',UTD]},
        {t:{fr:'Fièvre jaune',en:'Yellow fever',ar:'الحمى الصفراء'}, s:{fr:'9 mois · mars 2021',en:'9 months · Mar 2021',ar:'9 أشهر · مارس 2021'}, b:['green',UTD]}
      ],
      reports:[{t:{fr:'Consultation de suivi',en:'Follow-up visit',ar:'زيارة متابعة'}, s:{fr:'Dr Aminata Sawadogo · 28 sept. 2026 · Croissance normale',en:'Dr Aminata Sawadogo · 28 Sep 2026 · Normal growth',ar:'د. أميناتا ساوادوغو · 28 سبتمبر 2026 · نمو طبيعي'}}],
      vitals:[{t:{fr:'Poids · Taille',en:'Weight · Height',ar:'الوزن · الطول'}, s:{fr:'21 kg · 1,16 m',en:'21 kg · 1.16 m',ar:'21 كغ · 1.16 م'}, b:['green',OK]}],
      history:[{t:{fr:'Paludisme (accès simple)',en:'Malaria (uncomplicated)',ar:'ملاريا بسيطة'}, s:{fr:'2024 · guéri',en:'2024 · recovered',ar:'2024 · شُفي'}}],
      blood:[{t:{fr:'Groupe sanguin O+',en:'Blood group O+',ar:'فصيلة الدم O+'}, s:{fr:'CHUP-CDG · 2020',en:'CHUP-CDG · 2020',ar:'CHUP-CDG · 2020'}, b:['red',{fr:'O+',en:'O+',ar:'O+'}]}],
      allergy:[{t:{fr:'Aucune allergie connue',en:'No known allergy',ar:'لا حساسية معروفة'}}],
      contacts:[{t:{fr:'Aïcha Ouédraogo (mère)',en:'Aïcha Ouédraogo (mother)',ar:'عائشة ويدراوغو (الأم)'}, s:{fr:'Responsable légale · 70 52 00 02',en:'Legal guardian · 70 52 00 02',ar:'الولية الشرعية · 70 52 00 02'}, b:['red',{fr:'Principal',en:'Main',ar:'رئيسي'}]}],
      docs:[{t:{fr:'Carte nationale de santé (enfant)',en:'National health card (child)',ar:'البطاقة الصحية الوطنية (طفل)'}, s:{fr:'BF 0042 1187 5548 · Délivrée le 2 nov. 2026',en:'BF 0042 1187 5548 · Issued 2 Nov 2026',ar:'BF 0042 1187 5548 · صدرت في 2 نوفمبر 2026'}}]
    },
    grace:{
      vacc:[
        {t:{fr:'BCG',en:'BCG',ar:'لقاح السل'}, s:{fr:'À la naissance · janv. 2022',en:'At birth · Jan 2022',ar:'عند الولادة · يناير 2022'}, b:['green',UTD]},
        {t:{fr:'Pentavalent (3 doses)',en:'Pentavalent (3 doses)',ar:'اللقاح الخماسي (3 جرعات)'}, s:{fr:'6, 10 et 14 semaines · 2022',en:'6, 10 and 14 weeks · 2022',ar:'6 و10 و14 أسبوعًا · 2022'}, b:['green',UTD]},
        {t:{fr:'Rougeole-Rubéole — 2e dose',en:'Measles-rubella — 2nd dose',ar:'الحصبة والحصبة الألمانية — الجرعة الثانية'}, s:{fr:'Rappel à prévoir ce mois-ci',en:'Booster due this month',ar:'جرعة معززة هذا الشهر'}, b:['orange',{fr:'À faire',en:'Due',ar:'مستحق'}]}
      ],
      doctors:[{t:{fr:'Dr Aminata Sawadogo',en:'Dr Aminata Sawadogo',ar:'د. أميناتا ساوادوغو'}, s:{fr:'Pédiatrie · CHUP-CDG',en:'Paediatrics · CHUP-CDG',ar:'طب الأطفال · CHUP-CDG'}, b:['red',{fr:'Pédiatre',en:'Paediatrician',ar:'طبيبة أطفال'}]}],
      allergy:[{t:{fr:'Arachide',en:'Peanut',ar:'الفول السوداني'}, s:{fr:'Urticaire · signalée en 2025',en:'Hives · reported 2025',ar:'شرى · مُبلَّغ عنه في 2025'}, b:['red',{fr:'Allergie',en:'Allergy',ar:'حساسية'}]}],
      vitals:[{t:{fr:'Poids · Taille',en:'Weight · Height',ar:'الوزن · الطول'}, s:{fr:'16 kg · 1,02 m',en:'16 kg · 1.02 m',ar:'16 كغ · 1.02 م'}, b:['green',OK]}],
      blood:[{t:{fr:'Groupe sanguin A+',en:'Blood group A+',ar:'فصيلة الدم A+'}, s:{fr:'CHUP-CDG · 2022',en:'CHUP-CDG · 2022',ar:'CHUP-CDG · 2022'}, b:['red',{fr:'A+',en:'A+',ar:'A+'}]}],
      contacts:[{t:{fr:'Aïcha Ouédraogo (mère)',en:'Aïcha Ouédraogo (mother)',ar:'عائشة ويدراوغو (الأم)'}, s:{fr:'Responsable légale · 70 52 00 02',en:'Legal guardian · 70 52 00 02',ar:'الولية الشرعية · 70 52 00 02'}, b:['red',{fr:'Principal',en:'Main',ar:'رئيسي'}]}],
      docs:[{t:{fr:'Carte nationale de santé (enfant)',en:'National health card (child)',ar:'البطاقة الصحية الوطنية (طفل)'}, s:{fr:'BF 0042 1187 5556 · Délivrée le 2 nov. 2026',en:'BF 0042 1187 5556 · Issued 2 Nov 2026',ar:'BF 0042 1187 5556 · صدرت في 2 نوفمبر 2026'}}]
    },
    mahoutin:{
      labs:[{t:{fr:'NFS',en:'CBC',ar:'تعداد الدم'}, s:{fr:'CHU Yalgado · 3 mars 2026 · Normal',en:'CHU Yalgado · 3 Mar 2026 · Normal',ar:'CHU Yalgado · 3 مارس 2026 · طبيعي'}, b:['green',OK]}],
      vacc:[
        {t:{fr:'Tétanos-diphtérie (Td)',en:'Tetanus-diphtheria (Td)',ar:'الكزاز والخناق'}, s:{fr:'Rappel · 2025',en:'Booster · 2025',ar:'جرعة معززة · 2025'}, b:['green',UTD]},
        {t:{fr:'Fièvre jaune',en:'Yellow fever',ar:'الحمى الصفراء'}, s:{fr:'Valable à vie · 2011',en:'Valid for life · 2011',ar:'صالح مدى الحياة · 2011'}, b:['green',UTD]}
      ],
      certs:[{t:{fr:'Certificat d\'aptitude au sport',en:'Sports fitness certificate',ar:'شهادة لياقة رياضية'}, s:{fr:'Dr Seydou Ouédraogo · 10 sept. 2026',en:'Dr Seydou Ouédraogo · 10 Sep 2026',ar:'د. سيدو ويدراوغو · 10 سبتمبر 2026'}}],
      vitals:[{t:{fr:'Poids · Taille',en:'Weight · Height',ar:'الوزن · الطول'}, s:{fr:'58 kg · 1,71 m',en:'58 kg · 1.71 m',ar:'58 كغ · 1.71 م'}, b:['green',OK]}],
      blood:[{t:{fr:'Groupe sanguin O+',en:'Blood group O+',ar:'فصيلة الدم O+'}, s:{fr:'CHU Yalgado · 2019',en:'CHU Yalgado · 2019',ar:'CHU Yalgado · 2019'}, b:['red',{fr:'O+',en:'O+',ar:'O+'}]}],
      contacts:[{t:{fr:'Aïcha Ouédraogo (mère)',en:'Aïcha Ouédraogo (mother)',ar:'عائشة ويدراوغو (الأم)'}, s:{fr:'Responsable légale · 70 52 00 02',en:'Legal guardian · 70 52 00 02',ar:'الولية الشرعية · 70 52 00 02'}, b:['red',{fr:'Principal',en:'Main',ar:'رئيسي'}]}],
      docs:[{t:{fr:'Carte nationale de santé (mineur)',en:'National health card (minor)',ar:'البطاقة الصحية الوطنية (قاصر)'}, s:{fr:'BF 0042 1187 5563 · Délivrée le 2 nov. 2026',en:'BF 0042 1187 5563 · Issued 2 Nov 2026',ar:'BF 0042 1187 5563 · صدرت في 2 نوفمبر 2026'}}]
    }
  };
  const MONTHS = {fr:['Juin','Juil','Août','Sept','Oct','Nov'],en:['Jun','Jul','Aug','Sep','Oct','Nov'],ar:['يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر']};
  const WEIGHTS = {me:[64.8,64.5,64.2,63.9,63.6,64.0], kevin:[20.1,20.3,20.4,20.6,20.8,21.0], grace:[15.2,15.4,15.5,15.7,15.8,16.0], mahoutin:[55.9,56.4,56.8,57.2,57.6,58.0]};

  /* ---------- Pharmacie ---------- */
  const PHARMACIES = [
    {id:'etoile', name:'Pharmacie de l\'Hôpital', area:'Pissy', km:0.8, garde:true, hours:'19:00 – 08:00'},
    {id:'stcamille', name:'Pharmacie Saint-Camille', area:'Centre-ville', km:1.4, garde:true, hours:'19:00 – 08:00'},
    {id:'gbegamey', name:'Pharmacie Wemtenga', area:'Wemtenga', km:2.1, garde:true, hours:'19:00 – 08:00'},
    {id:'port', name:'Pharmacie du Centre', area:'Koulouba', km:2.9, garde:false, hours:'08:00 – 20:00'},
    {id:'fidjrosse', name:'Pharmacie de Dassasgho', area:'Dassasgho', km:3.2, garde:false, hours:'08:00 – 21:00'},
    {id:'kossodo', name:'Pharmacie de Kossodo', area:'Kossodo', km:11.5, garde:false, hours:'08:00 – 21:00'}
  ];
  const MEDICINES = [
    {id:'para', name:'Paracétamol 500 mg', cls:{fr:'Antalgique / Antipyrétique · Boîte de 16 comprimés',en:'Painkiller / Antipyretic · Box of 16 tablets',ar:'مسكن وخافض للحرارة · علبة 16 قرصًا'}, price:500, ph:'etoile', more:8},
    {id:'parasy', name:'Paracétamol sirop enfant', cls:{fr:'Antipyrétique enfant · Flacon 100 ml',en:'Children’s antipyretic · 100 ml bottle',ar:'خافض حرارة للأطفال · قارورة 100 مل'}, price:1200, ph:'stcamille', more:6},
    {id:'cta', name:'Artéméther + Luméfantrine', cls:{fr:'Antipaludique CTA · Boîte de 24 comprimés',en:'ACT antimalarial · Box of 24 tablets',ar:'مضاد ملاريا · علبة 24 قرصًا'}, price:1500, ph:'etoile', more:5, rx:true},
    {id:'amox', name:'Amoxicilline 500 mg', cls:{fr:'Antibiotique · Boîte de 12 gélules',en:'Antibiotic · Box of 12 capsules',ar:'مضاد حيوي · علبة 12 كبسولة'}, price:1800, ph:'stcamille', more:6, rx:true},
    {id:'sro', name:'SRO + Zinc', cls:{fr:'Réhydratation orale · Kit enfant',en:'Oral rehydration · Child kit',ar:'محلول إماهة فموي · طقم للأطفال'}, price:600, ph:'gbegamey', more:9},
    {id:'ibu', name:'Ibuprofène 400 mg', cls:{fr:'Anti-inflammatoire · Boîte de 20 comprimés',en:'Anti-inflammatory · Box of 20 tablets',ar:'مضاد التهاب · علبة 20 قرصًا'}, price:900, ph:'etoile', more:7},
    {id:'fer', name:'Fer + Acide folique', cls:{fr:'Supplément · Boîte de 30 comprimés',en:'Supplement · Box of 30 tablets',ar:'مكمّل · علبة 30 قرصًا'}, price:1200, ph:'gbegamey', more:6},
    {id:'vitc', name:'Vitamine C 500 mg', cls:{fr:'Vitamine · Tube de 10 comprimés',en:'Vitamin · Tube of 10 tablets',ar:'فيتامين · أنبوب 10 أقراص'}, price:1000, ph:'fidjrosse', more:7},
    {id:'moust', name:'Moustiquaire imprégnée', cls:{fr:'Prévention du paludisme · 2 places',en:'Malaria prevention · double bed',ar:'ناموسية معالجة · سرير مزدوج'}, price:3000, ph:'port', more:4},
    {id:'salbu', name:'Salbutamol 100 µg', cls:{fr:'Bronchodilatateur · Aérosol 200 doses',en:'Bronchodilator · Inhaler 200 doses',ar:'موسع قصبات · بخاخ 200 جرعة'}, price:3500, ph:'stcamille', more:3, rx:true},
    {id:'amlo', name:'Amlodipine 5 mg', cls:{fr:'Antihypertenseur · Boîte de 30 comprimés',en:'Antihypertensive · Box of 30 tablets',ar:'خافض ضغط · علبة 30 قرصًا'}, price:2500, ph:'port', more:4, rx:true},
    {id:'metf', name:'Metformine 500 mg', cls:{fr:'Antidiabétique · Boîte de 30 comprimés',en:'Antidiabetic · Box of 30 tablets',ar:'مضاد السكري · علبة 30 قرصًا'}, price:2000, ph:'etoile', more:5, rx:true}
  ];

  const OPERATORS = [
    {id:'orange', name:'Orange Money', c:'#ff7900', fg:'#fff', ini:'OM'},
    {id:'moov', name:'Moov Money', c:'#0a63b0', fg:'#fff', ini:'MOOV'},
    {id:'telecel', name:'Telecel Money', c:'#e2001a', fg:'#fff', ini:'TM'}
  ];

  /* ---------- Assurance (indicatif) ---------- */
  const INSURANCE = { usd:25, rate:586.78, annual:14700, plans:{1:[14700],3:[4900,4900,4900],4:[3675,3675,3675,3675]},
    discounts:[['disc1','-10 %'],['disc2','-15 %'],['disc3','-10 %']] };

  return {SAMU_DIRECT,ER_HOSPITALS,OUAGA,FACILITY_TYPES,FACILITIES,SPECIALTIES,doctorsFor,PROFILES,GUARDIAN,RECORD,RECORDS,MONTHS,WEIGHTS,PHARMACIES,MEDICINES,OPERATORS,INSURANCE};
})();
