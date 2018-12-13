import _ from 'lodash';

import { Place } from '../datatypes';

export const HARDCODED_PLACES: Array<Place> = [

  // Auto-generated
  //  - `App.state.ebird.barchartSpecies(props).then(x => print(json(x))).catch(pp)`
  //  - TODO Map ignored species to known species (e.g. like py metadata.ebird.com_names_to_species)

  {
    name: 'CA',
    props: {r: 'US-CA', byr: 2008},
    species: ["BBWD","FUWD","EMGO","SNGO","ROGO","GWFG","TABG","TUBG","BRAN","CACG","CANG","MUSW","TRUS","TUSW","WHOS","EGGO","MUDU","WODU","manduc","GARG","BWTE","CITE","NSHO","GADW","FADU","EUWI","AMWI","NOPI","GWTE","CANV","REDH","COMP","RNDU","TUDU","GRSC","LESC","KIEI","COEI","HADU","SUSC","COSC","BLSC","LTDU","BUFF","COGO","BAGO","HOME","COME","RBME","RUDU","MOUQ","CAQU","GAQU","INPE","CHUK","RNEP","RUGR","GRSG","WTPT","SOGR","WITU","PBGR","HOGR","RNGR","EAGR","WEGR","CLGR","RODO","BTPI","EUCD","AFCD","SPDO","INDO","COGD","RUGD","WWDO","MODO","GBAN","GRRO","YBCU","BBCU","COCU","LENI","CONI","COPO","EWPW","MWPW","BLSW","CHSW","VASW","COSW","WTSW","BTHH","RTHU","BCHU","ANHU","COHU","BTAH","RUHU","ALHU","CAHU","BBIH","VCHU","RIRA","VIRA","SORA","COGA","AMCO","PUGA","YERA","BLRA","SACR","CCRA","BNST","AMAV","AMOY","BLOY","BBPL","AMGP","PAGP","LSAP","SNPL","WIPL","CRPL","SEPL","KILL","MOPL","UPSA","WHIM","LBCU","BTGO","HUGO","MAGO","RUTU","BLTU","REKN","SURF","RUFF","SPTS","STSA","CUSA","RNST","SAND","DUNL","ROSA","PUSA","BASA","LIST","LESA","WRSA","BBSA","PESA","SESA","WESA","SBDO","LBDO","AMWO","COSN","WISN","WIPH","RNPH","REPH","SPSA","SOSA","WATA","GRYE","WILL","LEYE","MASA","WOSA","SPSK","POJA","PAJA","LTJA","COMU","TBMU","PIGU","LBMU","MAMU","SCMU","GUMU","CRMU","ANMU","CAAU","PAAU","RHAU","HOPU","TUPU","STGU","BLKI","IVGU","SAGU","BOGU","BHGU","LIGU","ROGU","LAGU","FRGU","BTGU","HEEG","MEGU","RBGU","WEGU","YFGU","CAGU","HERG","ICGU","LBBG","SBGU","GWGU","GLGU","GBBG","KEGU","SOTE","BRTE","LETE","GBTE","CATE","BLTE","COTE","ARTE","FOTE","ROYT","ELTE","BLSK","RBTR","RTTR","RTLO","ARLO","PALO","COLO","YBLO","SAAL","LAAL","BFAL","STAL","WISP","FTSP","LESP","TOSP","ASSP","BSTP","WRSP","BLSP","LSTP","NOFU","GFPE","KEPE","MUPE","MOPE","HAPE","COPE","STPE","JOPE","WCPE","COSH","PFSH","FFSH","GRSH","WTSH","BULS","SOSH","SRTS","MASH","BVSH","WOST","MAFR","GREF","MABO","NABO","BFBO","BRBO","RFBO","NOGA","BRAC","PECO","NECO","DCCO","AWPE","BRPE","AMBI","LEBI","GBHE","GREG","SNEG","LBHE","TRHE","REEG","CAEG","GRHE","BCNH","YCNH","WHIB","GLIB","WFIB","ROSP","CACO","BLVU","TUVU","OSPR","WTKI","STKI","GOEA","MIKI","NOHA","SSHA","COHA","NOGO","BAEA","COBH","HASH","GRHA","RSHA","BWHA","SWHA","ZTHA","RTHA","RLHA","FEHA","BANO","FLOW","WESO","GHOW","SNOW","NOPO","ELOW","BUOW","SPOW","BADO","GGOW","LEOW","SEOW","NSWO","BEKI","EUWR","WISA","YBSA","RNSA","RBSA","LEWO","ACWO","GIWO","BBWO","DOWO","NUWO","LBWO","HAWO","WHWO","PIWO","NOFL","GIFL","CRCA","AMKE","MERL","GYRF","PEFA","PRFA","RRPA","MOPA","WWPA","yecpar","RCPA","LCPA","RLPA","YHPA","YCPA","TFAM","WFPA","NAPA","bucpar","MIPA","RMPA","OSFL","GRPE","WEWP","EAWP","YBFL","ALFL","WIFL","LEFL","HAFL","GRFL","DUFL","PSFL","COFL","BBFL","BLPH","EAPH","SAPH","VEFL","DCFL","ATFL","GCFL","BCFL","SBFL","TRKI","COKI","CAKI","TBKI","WEKI","EAKI","STFL","BROS","LOSH","NSHR","WEVI","BEVI","GRVI","HUVI","YTVI","CAVI","BHVI","PLVI","PHVI","WAVI","YGVI","GRAJ","BTMJ","PIJA","STJA","BLJA","ISSJ","CASJ","WOSJ","BBMA","YBMA","CLNU","AMCR","CORA","HOLA","EUSK","NRWS","PUMA","TRES","VGSW","BANS","BARS","CLSW","CASW","BCCH","MOCH","CBCH","OATI","JUTI","VERD","BUSH","RBNU","WBNU","PYNU","BRCR","ROWR","CANW","HOWR","PAWR","WIWR","SEWR","MAWR","BEWR","CACW","BGGN","CAGN","BTGN","AMDI","RWBU","GCKI","RCKI","DUWA","ARWA","WREN","JAWE","BLUE","RFBL","NOWH","WEBL","MOBL","TOSO","VATH","VEER","GCTH","SWTH","HETH","WOTH","AMRO","RBRO","GRCA","CBTH","BRTH","BETH","CATH","LCTH","CRTH","SATH","NOMO","EUST","EYWA","CIWA","WHWA","OBPI","RTPI","AMPI","SPPI","BOWA","CEDW","PHAI","BRAM","EVGR","HAWF","PIGR","GCRF","BLRF","HOFI","PUFI","CAFI","CORE","RECR","WWCR","EUGO","PISI","LEGO","LAGO","AMGO","LALO","CCLO","SMLO","MCLO","SNBU","LIBU","RUBU","CASP","GRSP","CHSP","CCSP","BCSP","FISP","BRSP","BTSP","LASP","LARB","ATSP","FOSP","DEJU","WCSP","GCSP","HASP","WTSP","SABS","BESP","VESP","LCSP","NESP","SAVS","BAIS","SOSP","LISP","SWSP","ABTO","CALT","RCSP","GTTO","SPTO","YBCH","YHBL","BOBO","WEME","EAME","OROR","HOOR","SBAO","BUOR","BAOR","SCOR","RWBL","TRBL","BROC","BHCO","RUBL","BRBL","COGR","GTGR","OVEN","WEWA","LOWA","NOWA","GWWA","BWWA","BAWW","PROW","TEWA","OCWA","LUWA","NAWA","VIWA","CONW","MGWA","MOWA","KEWA","COYE","HOWA","AMRE","CMWA","CERW","NOPA","TRPA","MAWA","BBWA","BLBW","YEWA","CSWA","BLPW","BTBW","PAWA","PIWA","YRWA","YTWA","PRAW","GRWA","BTYW","TOWA","HEWA","BTNW","CAWA","WIWA","RFWA","PARE","HETA","SUTA","SCTA","WETA","NOCA","PYRR","RBGR","BHGR","BLGR","LAZB","INBU","VABU","PABU","DICK","HOSP","NRBI","OCHW","BRMA","SBMU","PTWH"],
  },

  {
    name: 'TX',
    props: {r: 'US-TX', byr: 2008},
    species: ["BBWD","FUWD","SNGO","ROGO","GRGO","swagoo1","GWFG","BRAN","CACG","CANG","MUSW","TRUS","TUSW","EGGO","MUDU","RITE","WODU","BWTE","CITE","NSHO","GADW","EUWI","AMWI","ABDU","MODU","WCHP","NOPI","GWTE","CANV","REDH","RNDU","GRSC","LESC","KIEI","SUSC","BLSC","LTDU","BUFF","COGO","BAGO","HOME","COME","RBME","MADU","RUDU","PLCH","HELG","NOBO","SCQU","GAQU","MONQ","INPE","RNEP","GRPC","LEPC","WITU","AMFL","grefla3","LEGR","PBGR","HOGR","RNGR","EAGR","WEGR","CLGR","RODO","WCPI","RBPI","BTPI","EUCD","AFCD","INDO","COGD","RUGD","WTDO","WWDO","MODO","GBAN","GRRO","YBCU","MACU","BBCU","LENI","CONI","COPA","COPO","CWWI","EWPW","MWPW","CHSW","WTSW","MEVI","GNBM","RIHU","ATHU","BTHH","LUHU","RTHU","BCHU","ANHU","COHU","BTAH","RUHU","ALHU","CAHU","BBIH","BBEH","VCHU","WEHU","KIRA","CLRA","VIRA","SORA","COGA","AMCO","PUGA","YERA","BLRA","SACR","CCRA","WHCR","BNST","AMAV","AMOY","BBPL","AMGP","COPL","SNPL","WIPL","SEPL","PIPL","KILL","MOPL","NOJA","UPSA","WHIM","LBCU","BTGO","BTGD","HUGO","MAGO","RUTU","REKN","SURF","RUFF","STSA","CUSA","RNST","SAND","DUNL","PUSA","BASA","LESA","WRSA","BBSA","PESA","SESA","WESA","SBDO","LBDO","AMWO","WISN","WIPH","RNPH","REPH","SPSA","SOSA","GRYE","WILL","LEYE","SPSK","POJA","PAJA","LTJA","BLKI","SAGU","BOGU","LIGU","LAGU","FRGU","HEEG","MEGU","RBGU","WEGU","CAGU","HERG","ICGU","LBBG","SBGU","GLGU","GBBG","KEGU","BRNO","SOTE","BRTE","LETE","GBTE","CATE","BLTE","COTE","ARTE","FOTE","ROYT","SATE","ELTE","BLSK","WTTR","RBTR","RTLO","PALO","COLO","LESP","BSTP","COSH","GRSH","SOSH","MASH","AUSH","JABI","WOST","MAFR","MABO","BRBO","NOGA","ANHI","NECO","DCCO","AWPE","BRPE","AMBI","LEBI","BTTH","GBHE","GREG","SNEG","LBHE","TRHE","REEG","CAEG","GRHE","BCNH","YCNH","WHIB","GLIB","WFIB","ROSP","BLVU","TUVU","OSPR","WTKI","HBKI","STKI","GOEA","SNKI","DTKI","MIKI","NOHA","SSHA","COHA","NOGO","BAEA","COBH","GBLH","ROHA","HASH","WTHA","GRHA","RSHA","BWHA","STHA","SWHA","ZTHA","RTHA","RLHA","FEHA","BANO","FLOW","WESO","EASO","GHOW","SNOW","NOPO","FEPO","ELOW","BUOW","SPOW","BADO","LEOW","SEOW","NSWO","ELTR","RIKI","BEKI","AMKI","GKIN","WISA","YBSA","RNSA","LEWO","RHWO","ACWO","GFWO","RBWO","DOWO","LBWO","RCWO","HAWO","PIWO","NOFL","CRCA","AMKE","MERL","APFA","PEFA","PRFA","succoc","MOPA","WWPA","RCPA","LCPA","RLPA","YHPA","WFPA","NAPA","BAYM","CFMA","GREP","NOBT","WCEL","TUFL","OSFL","GRPE","WEWP","EAWP","YBFL","ACFL","ALFL","WIFL","LEFL","HAFL","GRFL","DUFL","PSFL","COFL","BBFL","BLPH","EAPH","SAPH","VEFL","DCFL","ATFL","NUFL","GCFL","BCFL","GKIS","SBFL","PIRF","VAFL","TRKI","COKI","CAKI","WEKI","EAKI","GRAK","STFL","FTFL","RTBE","LOSH","NSHR","BCVI","WEVI","BEVI","GRVI","HUVI","YTVI","CAVI","BHVI","PLVI","PHVI","WAVI","YGVI","BWVI","BRJA","GREJ","PIJA","STJA","BLJA","WOSJ","MEJA","BBMA","CLNU","AMCR","TACR","FICR","CHRA","CORA","HOLA","NRWS","PUMA","TRES","VGSW","BANS","BARS","CLSW","CASW","CACH","MOCH","JUTI","TUTI","BCTI","VERD","BUSH","RBNU","WBNU","PYNU","BHNU","BRCR","ROWR","CANW","HOWR","WIWR","SEWR","MAWR","CARW","BEWR","CACW","BGGN","BTGN","AMDI","RVBU","GCKI","RCKI","NOWH","EABL","WEBL","MOBL","TOSO","VATH","VEER","GCTH","SWTH","HETH","WOTH","AZTH","WTTH","CCTH","AMRO","RBRO","GRCA","CBTH","BRTH","LBTH","CRTH","SATH","TRMO","NOMO","EUST","AMPI","SPPI","CEDW","PHAI","EVGR","GCRF","HOFI","PUFI","CAFI","CORE","RECR","WWCR","EUGO","PISI","LEGO","LAGO","AMGO","LALO","CCLO","SMLO","MCLO","BOSP","CASP","BACS","GRSP","OLSP","CHSP","CCSP","BCSP","FISP","BRSP","BTSP","LASP","LARB","ATSP","FOSP","DEJU","YEJU","WCSP","GCSP","HASP","WTSP","SABS","SSPA","VESP","LCSP","SESP","NESP","SAVS","BAIS","HESP","SOSP","LISP","SWSP","CANT","RCSP","GTTO","SPTO","EATO","YBCH","YHBL","BOBO","WEME","EAME","BVOR","OROR","HOOR","BUOR","ALOR","AUOR","BAOR","SCOR","RWBL","BROC","BHCO","RUBL","BRBL","COGR","BTGR","GTGR","OVEN","WEWA","LOWA","NOWA","GWWA","BWWA","BAWW","PROW","SWWA","TEWA","OCWA","COLW","LUWA","NAWA","VIWA","CONW","GCYE","MGWA","MOWA","KEWA","COYE","HOWA","AMRE","CMWA","CERW","NOPA","TRPA","MAWA","BBWA","BLBW","YEWA","CSWA","BLPW","BTBW","PAWA","PIWA","YRWA","YTWA","PRAW","GRWA","BTYW","TOWA","HEWA","GCWA","BTNW","RCWA","GCRW","CAWA","WIWA","RFWA","PARE","STRE","HETA","SUTA","SCTA","WETA","FCTA","CCGR","NOCA","PYRR","RBGR","BHGR","BLBU","BLGR","LAZB","INBU","VABU","PABU","DICK","RLHO","SAFI","YFGR","HOSP","NRBI","OCHW","BRMA","SBMU"],
  },

  {
    name: 'Costa Rica (winter)',
    props: {r: 'CR', bmo: 12, emo: 2, byr: 2008},
    species: ["HITI","GRTI","LITI","SBTI","THTI","BBWD","FUWD","MUDU","BWTE","CITE","NSHO","AMWI","NOPI","GWTE","CANV","REDH","RNDU","LESC","HOME","MADU","RUDU","PLCH","GHEC","CRGU","BLAG","GRCU","TFQU","BCWP","CRBO","MAWQ","BEWQ","BBWQ","SPWQ","LEGR","PBGR","RODO","PVPI","SCPI","WCPI","RBPI","BTPI","RUDP","SBPI","EUCD","INDO","COGD","PBGD","RUGD","BLGD","MCGD","RUQD","VIQD","OBQD","WTDO","GCDO","GHDO","BFQD","PBQD","CHQD","WWDO","MODO","GRTA","SBAN","GBAN","STCU","PHCU","LEGC","RVGC","SQCU","YBCU","MACU","COCC","BBCU","LENI","CONI","SHTN","COPA","WTNI","CWWI","RUNI","EWPW","DUNI","GRPO","CPOT","NORP","BLSW","WCHS","SFSW","CCSW","WCSW","CHSW","VASW","CRSW","GRSW","LSTS","WNJA","WTSI","BRHE","BTBA","GREH","LBIH","STHR","GFRL","BRVI","LEVI","PCFA","GNBM","VEMA","GRET","BCCO","WCCO","GCBR","TAHU","LBST","PCST","FTHU","WBMG","PTMG","WTMG","MTWO","RTHU","VOHU","SCHU","CAEM","GAEM","VHHU","SBRH","VISA","BTPL","CRWO","STHM","BLBH","WTEM","CHEM","SNOC","BCHH","CHHU","MAHU","SVHU","SBEH","RTAH","CIHU","SHTH","BTRG","MARA","PBCR","SPRA","UNIC","RNWR","RSWR","GCWR","SORA","COGA","AMCO","PUGA","OCCR","YBCR","WTCR","GBCR","SUNG","LIMP","DSTK","BNST","AMAV","AMOY","BBPL","AMGP","SOLA","COPL","SNPL","WIPL","SEPL","KILL","NOJA","WAJA","WHIM","LBCU","MAGO","RUTU","REKN","SURF","STSA","SAND","DUNL","BASA","LESA","WRSA","PESA","SESA","WESA","SBDO","LBDO","WISN","WIPH","RNPH","REPH","SPSA","SOSA","WATA","GRYE","WILL","LEYE","POJA","PAJA","LTJA","BLKI","SAGU","BOGU","LAGU","FRGU","RBGU","HERG","GBBG","KEGU","BRNO","WHTT","SOTE","BRTE","LETE","GBTE","CATE","BLTE","COTE","FOTE","ROYT","SATE","ELTE","BLSK","SUNB","RBTR","WISP","LESP","WRSP","BLSP","LSTP","PFSH","WTSH","GASH","JABI","WOST","MAFR","GREF","MABO","NABO","BFBO","BRBO","RFBO","ANHI","NECO","AWPE","BRPE","PIBI","LEBI","RTHE","FTHE","BTTH","GBHE","GREG","SNEG","LBHE","TRHE","REEG","CAEG","GRHE","STRH","AGHE","WHHE","BCNH","YCNH","BBHE","WHIB","GLIB","GRIB","ROSP","KIVU","BLVU","TUVU","LYHV","OSPR","PEKI","WTKI","HBKI","GHKI","STKI","CREA","HAEA","BLHE","ORHE","BAWH","BCHA","SNKI","DTKI","MIKI","PLKI","NOHA","GBEH","TIHA","SSHA","COHA","BIHA","CRHA","COBH","SAHA","GBLH","SOEA","BAHA","ROHA","HASH","WTHA","WHHA","SEHA","GRHA","GLHA","BWHA","STHA","SWHA","ZTHA","RTHA","BANO","BSSO","TRSO","VESO","PASO","CROW","SPEO","GHOW","CRPO","CAPO","FEPO","MOOW","BLWO","STRO","USWO","REQU","LTTR","STTR","BHTR","BATR","GATR","BTHT","ELTR","OBTR","COTR","TOMO","LEMO","RMOT","KBMO","BBMO","TBMO","RIKI","BEKI","AMKI","APKI","GKIN","GARK","WNPU","PIPU","WWPU","LAMO","WFNU","RTJA","GJAC","RHBA","PBBA","NOET","COAR","FBAR","YETO","YTTO","KBTO","OLPI","YBSA","ACWO","GNWO","BCWO","RCRW","HOWO","HAWO","SMBW","RRWO","PBIW","LIWO","CIWO","CCOW","RWWO","GOWO","BAFF","SBFF","COFF","RTCA","CRCA","YHCA","LAFA","AMKE","MERL","APFA","BAFA","PEFA","RFPA","BAPA","OCPA","BHOP","BHEP","WCPA","RLPA","YNPA","WFPA","MEAP","SWPA","OTPA","OFPA","BTPA","GGMA","SCMA","CFPA","RRAN","FAAN","GANT","BAAN","BCAS","BHOA","RUAN","PLAN","STCA","SPCA","CTAN","WFLA","SLAN","DWAN","DUAN","BACA","CBAN","DMAN","ZEAN","BIAN","SPAN","OCAN","BCAP","SCAA","SCHA","THAN","OBAN","SFTA","BFAN","BHEA","RBAN","TTLE","STLE","GTLE","OLWO","LTWO","RUWO","TWWO","PBRW","WBWO","NOBW","BBNW","SNBW","COWO","IBIW","BSWO","SPWO","BBSC","SHWO","SCRW","PLXE","STXE","BUTU","BFFG","STFG","LIFG","RUFG","SBTR","BTFG","STPW","SPBA","RUTR","RFSP","SLSP","PBSP","YBTY","BCTY","NOBT","SOBT","MCTY","COCF","YETY","YCTY","GREL","YBEL","LEEL","MOEL","TOTY","OSTF","OBFL","SECF","SLCF","RBTY","RLTY","NOSF","BPYT","SCPT","NOBE","SHTF","COTF","BHTF","ERFL","YOFL","YMFL","STTS","WTRS","GCRS","ROFL","RDTF","SRFL","BTFL","BCOF","TCFL","TUFL","OSFL","DAPE","OCPE","WEWP","EAWP","TROP","YBFL","ACFL","ALFL","WIFL","WTFL","LEFL","YEFL","BCAF","BLPH","LTTY","BRAT","RMOU","DCFL","PAFL","NUFL","GCFL","BCFL","GKIS","BOBF","RMFL","SOFL","GCAF","WRFL","GBFL","STRF","SBFL","PIRF","TRKI","WEKI","EAKI","GRAK","STFL","FTFL","SHAR","PTFR","BNUM","LOCO","TUCO","RUFP","TWBE","YBCO","SNCO","LATM","LOTM","WRMA","BCRM","WCOM","OCMA","WCRM","RCMA","GHPI","BCRT","MATI","NOSC","SPMO","BABE","CIMB","WWBE","BAWB","RTBE","RBPE","SCRG","GRSV","TCGR","LESG","WEVI","MAVI","YTVI","YWVI","BHVI","PHVI","WAVI","BCAV","YGVI","STHJ","AHJA","WTMJ","BRJA","BCHJ","BAWS","NRWS","SRWS","PUMA","GYBM","BCMA","TRES","MANS","VGSW","BANS","BARS","CLSW","CASW","NIWR","SCBW","HOWR","OCWR","TIWR","SEWR","BABW","RNAW","BBEW","RBSW","SBSW","BTWR","BANW","RAWW","SIBW","CABW","CAKW","ISWR","RIWR","BAYW","WBWW","GBWW","SONW","TFGN","LBGN","WLGN","TRGN","AMDI","BFSO","BBNT","OBNT","SBNT","RCNT","BHNT","VEER","GCTH","SWTH","WOTH","MOTH","PVTH","WTTH","CCTH","SOOT","GRCA","TRMO","AMPI","CEDW","BAYS","LTSF","GBCH","SEUP","YCEU","TBEU","YTEU","ELEU","SPCE","OBAE","WVEU","TCEU","LEGO","YBSI","ROTT","ATCH","SCCH","COCL","SHSP","BOSP","GRSP","OLSP","BSTS","CCSP","CRBR","OBSP","CCBR","SFFI","VOJU","RCOS","WCSP","SAVS","LISP","LFFI","WEGS","CAGS","RUSP","YTFI","WNBR","WRET","YBCH","EAME","RBBL","YBIC","CROR","CHOR","MORO","SRCA","BCOR","OROR","YBOR","YTOR","SBAO","BUOR","SBOR","BAOR","RWBL","SHCO","BROC","GICO","MEBL","GTGR","NIGR","OVEN","WEWA","LOWA","NOWA","GWWA","BWWA","BAWW","PROW","FTHW","TEWA","OCWA","NAWA","GCYE","MGWA","MOWA","KEWA","OCYE","COYE","HOWA","AMRE","CMWA","CERW","NOPA","TRPA","MAWA","BBWA","BLBW","YEWA","CSWA","BLPW","BTBW","PAWA","YRWA","YTWA","TOWA","HEWA","GCWA","BTNW","RCWA","BCWA","GCRW","CRWA","BURW","CAWA","WIWA","STRE","COLR","DFTA","HETA","SUTA","SCTA","WETA","FCTA","WWTA","RCAT","RTAT","BCAT","CATA","BFAG","BTGG","RBGR","BLSE","BLGR","INBU","PABU","DICK","GHET","WSTA","TCTA","WLTA","WTST","CCTA","FRTA","BAGT","BGTA","YWTA","PALT","SPTA","GHOT","SCHT","PCTA","RWTA","BHTA","EMTA","STTA","STDA","BLDA","SHHO","RLHO","GRHO","SRTA","BAYT","SLFL","SLFI","PBFI","WTGF","BGRA","RBSE","TBSF","NISF","VASE","YBSE","SCSE","BANA","YFGR","COFI","BTSA","BHSA","GRAS","SSAL","SCOG","HOSP","TRMU"],
  },

  {
    name: 'Rancho Naturalista (winter)',
    props: {r: 'L468901', bmo: 12, emo: 2, byr: 2008},
    species: ["HITI","GRTI","LITI","BBWD","MUDU","GHEC","CRGU","BLAG","RODO","PVPI","RBPI","BTPI","RUDP","SBPI","INDO","RUGD","RUQD","WTDO","GCDO","PBQD","CHQD","WWDO","GBAN","STCU","SQCU","SHTN","COPA","CWWI","CPOT","CCSW","WCSW","VASW","GRSW","WNJA","WTSI","BTBA","GREH","LBIH","STHR","GFRL","BRVI","LEVI","PCFA","GNBM","GRET","BCCO","GCBR","TAHU","WBMG","PTMG","WTMG","RTHU","SCHU","GAEM","VHHU","SBRH","VISA","BTPL","CRWO","BLBH","CHEM","SNOC","SVHU","RTAH","RSWR","PUGA","WTCR","SOLA","NOJA","SPSA","SUNB","ANHI","NECO","FTHE","GBHE","GREG","SNEG","LBHE","CAEG","GRHE","BCNH","BBHE","GRIB","KIVU","BLVU","TUVU","OSPR","WTKI","HBKI","GHKI","STKI","BLHE","DTKI","SSHA","COHA","BIHA","GBLH","BAHA","ROHA","WHHA","GRHA","BWHA","STHA","ZTHA","RTHA","CROW","SPEO","CRPO","FEPO","MOOW","STRO","STTR","GATR","BTHT","COTR","LEMO","RMOT","BBMO","RIKI","AMKI","GKIN","LAMO","RTJA","RHBA","PBBA","NOET","COAR","YTTO","KBTO","YBSA","ACWO","BCWO","HOWO","SMBW","PBIW","LIWO","RWWO","GOWO","BAFF","CRCA","YHCA","LAFA","MERL","BAFA","PEFA","RFPA","BAPA","OCPA","BHOP","WCPA","SWPA","OTPA","CFPA","RRAN","FAAN","BAAN","RUAN","PLAN","CTAN","SLAN","DWAN","DUAN","DMAN","ZEAN","BIAN","SPAN","THAN","SFTA","BHEA","RBAN","TTLE","STLE","GTLE","OLWO","RUWO","PBRW","WBWO","NOBW","COWO","SPWO","BBSC","SHWO","SCRW","PLXE","STXE","BFFG","LIFG","BTFG","SPBA","RUTR","RFSP","SLSP","YETY","GREL","YBEL","LEEL","MOEL","TOTY","OSTF","OBFL","SLCF","RBTY","RLTY","SCPT","NOBE","COTF","BHTF","ERFL","YOFL","YMFL","WTRS","RDTF","SRFL","TCFL","TUFL","OSFL","DAPE","WEWP","EAWP","TROP","YBFL","ACFL","WIFL","WTFL","LEFL","YEFL","BLPH","LTTY","BRAT","RMOU","DCFL","GCFL","GKIS","BOBF","SOFL","GCAF","WRFL","GBFL","SBFL","PIRF","TRKI","RUFP","WRMA","WCOM","WCRM","RCMA","GHPI","BCRT","MATI","NOSC","BABE","CIMB","WWBE","RBPE","TCGR","LESG","YTVI","PHVI","BCAV","YGVI","BRJA","BAWS","NRWS","SRWS","PUMA","GYBM","BANS","BARS","NIWR","SCBW","HOWR","OCWR","BABW","BTWR","SIBW","CABW","BAYW","WBWW","GBWW","SONW","TFGN","LBGN","TRGN","AMDI","BFSO","OBNT","SBNT","BHNT","SWTH","WOTH","MOTH","PVTH","WTTH","CCTH","GRCA","TRMO","CEDW","BAYS","LTSF","GBCH","YCEU","YTEU","ELEU","OBAE","WVEU","TCEU","LEGO","ATCH","COCL","BSTS","OBSP","CCBR","SFFI","RCOS","WEGS","YTFI","WNBR","YBCH","EAME","RBBL","YBIC","CHOR","MORO","SRCA","BCOR","OROR","BAOR","SHCO","BROC","GICO","MEBL","GTGR","OVEN","WEWA","LOWA","NOWA","GWWA","BWWA","BAWW","TEWA","GCYE","MGWA","MOWA","KEWA","OCYE","COYE","AMRE","TRPA","MAWA","BBWA","BLBW","YEWA","CSWA","PAWA","YRWA","YTWA","TOWA","BTNW","RCWA","GCRW","CRWA","BURW","CAWA","WIWA","STRE","COLR","HETA","SUTA","WWTA","RTAT","CATA","BFAG","BTGG","RBGR","INBU","WSTA","TCTA","WLTA","CCTA","BAGT","BGTA","PALT","SPTA","GHOT","SCHT","PCTA","BHTA","EMTA","STTA","STDA","BLDA","SHHO","RLHO","GRHO","BAYT","SLFL","BGRA","TBSF","VASE","YBSE","BANA","YFGR","BTSA","BHSA","GRAS","HOSP"],
  },

  {
    name: 'A few random hotspots in CR (winter)', // XXX (Reminder that we can comma-separate multiple location ids)
    props: {r: 'L629014,L468901,L7221006', bmo: 12, emo: 2, byr: 2008},
    species: ["HITI","GRTI","LITI","BBWD","MUDU","GHEC","CRGU","BLAG","RODO","PVPI","RBPI","BTPI","RUDP","SBPI","INDO","RUGD","RUQD","WTDO","GCDO","PBQD","CHQD","WWDO","GBAN","STCU","SQCU","SHTN","COPA","CWWI","CPOT","CCSW","WCSW","VASW","GRSW","LSTS","WNJA","WTSI","BTBA","GREH","LBIH","STHR","GFRL","BRVI","LEVI","PCFA","GNBM","GRET","BCCO","GCBR","TAHU","WBMG","PTMG","WTMG","RTHU","SCHU","GAEM","VHHU","SBRH","VISA","BTPL","CRWO","BLBH","CHEM","SNOC","SVHU","RTAH","RSWR","PUGA","WTCR","BNST","SOLA","NOJA","SPSA","SUNB","ANHI","NECO","FTHE","GBHE","GREG","SNEG","LBHE","CAEG","GRHE","BCNH","YCNH","BBHE","GRIB","KIVU","BLVU","TUVU","OSPR","WTKI","HBKI","GHKI","STKI","BLHE","DTKI","SSHA","COHA","BIHA","GBLH","BAHA","ROHA","WHHA","GRHA","BWHA","STHA","ZTHA","RTHA","CROW","SPEO","CRPO","FEPO","MOOW","STRO","STTR","GATR","BTHT","COTR","LEMO","RMOT","BBMO","RIKI","AMKI","GKIN","LAMO","RTJA","RHBA","PBBA","NOET","COAR","YTTO","KBTO","YBSA","ACWO","BCWO","HOWO","SMBW","PBIW","LIWO","RWWO","GOWO","BAFF","CRCA","YHCA","LAFA","MERL","BAFA","PEFA","RFPA","BAPA","OCPA","BHOP","WCPA","SWPA","OTPA","CFPA","RRAN","FAAN","BAAN","RUAN","PLAN","CTAN","SLAN","DWAN","DUAN","DMAN","ZEAN","BIAN","SPAN","THAN","SFTA","BHEA","RBAN","TTLE","STLE","GTLE","OLWO","RUWO","PBRW","WBWO","NOBW","COWO","SPWO","BBSC","SHWO","SCRW","PLXE","STXE","BFFG","LIFG","BTFG","SPBA","RUTR","RFSP","SLSP","YETY","GREL","YBEL","LEEL","MOEL","TOTY","OSTF","OBFL","SLCF","RBTY","RLTY","SCPT","NOBE","COTF","BHTF","ERFL","YOFL","YMFL","WTRS","RDTF","SRFL","TCFL","TUFL","OSFL","DAPE","WEWP","EAWP","TROP","YBFL","ACFL","WIFL","WTFL","LEFL","YEFL","BLPH","LTTY","BRAT","RMOU","DCFL","GCFL","GKIS","BOBF","SOFL","GCAF","WRFL","GBFL","SBFL","PIRF","TRKI","RUFP","WRMA","WCOM","WCRM","RCMA","GHPI","BCRT","MATI","NOSC","BABE","CIMB","WWBE","RBPE","TCGR","LESG","YTVI","PHVI","BCAV","YGVI","BRJA","BAWS","NRWS","SRWS","PUMA","GYBM","MANS","BANS","BARS","CLSW","NIWR","SCBW","HOWR","OCWR","BABW","BTWR","SIBW","CABW","BAYW","WBWW","GBWW","SONW","TFGN","LBGN","TRGN","AMDI","BFSO","OBNT","SBNT","BHNT","SWTH","WOTH","MOTH","PVTH","WTTH","CCTH","GRCA","TRMO","CEDW","BAYS","LTSF","GBCH","YCEU","YTEU","ELEU","OBAE","WVEU","TCEU","LEGO","ATCH","COCL","BSTS","CCSP","OBSP","CCBR","SFFI","RCOS","WEGS","CAGS","YTFI","WNBR","YBCH","EAME","RBBL","YBIC","CHOR","MORO","SRCA","BCOR","OROR","BAOR","SHCO","BROC","GICO","MEBL","GTGR","OVEN","WEWA","LOWA","NOWA","GWWA","BWWA","BAWW","PROW","TEWA","GCYE","MGWA","MOWA","KEWA","OCYE","COYE","AMRE","TRPA","MAWA","BBWA","BLBW","YEWA","CSWA","PAWA","YRWA","YTWA","TOWA","BTNW","RCWA","GCRW","CRWA","BURW","CAWA","WIWA","STRE","COLR","HETA","SUTA","WWTA","RTAT","CATA","BFAG","BTGG","RBGR","BLGR","INBU","DICK","WSTA","TCTA","WLTA","CCTA","BAGT","BGTA","PALT","SPTA","GHOT","SCHT","PCTA","BHTA","EMTA","STTA","STDA","BLDA","SHHO","RLHO","GRHO","BAYT","SLFL","BGRA","TBSF","VASE","YBSE","BANA","YFGR","BTSA","BHSA","GRAS","HOSP"],
  },

];
