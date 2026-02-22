import { initDatabase, getDatabase } from '../database';
import { createWordbook, addWordsToWordbook } from '../database/wordbookDao';

// 高频100词数据
const HIGH_FREQUENCY_WORDS = [
  {
    word: "ability",
    phonetic: "/əˈbɪləti/",
    definition: "能力，才能",
    example: "She has the ability to solve complex problems.",
    split: "a-bi-li-ty",
    mnemonic: "a(阿) + bi(比) + li(利) + ty(体) = 阿比的利体能力强",
    partOfSpeech: "n."
  },
  {
    word: "able",
    phonetic: "/ˈeɪbl/",
    definition: "能够的，有能力的",
    example: "He is able to speak three languages.",
    split: "a-ble",
    mnemonic: "a(阿) + ble(百) = 阿能说百种语言",
    partOfSpeech: "adj."
  },
  {
    word: "about",
    phonetic: "/əˈbaʊt/",
    definition: "关于，大约",
    example: "Tell me about your family.",
    split: "a-bout",
    mnemonic: "a(阿) + bout(bout) = 阿在谈论bout",
    partOfSpeech: "prep."
  },
  {
    word: "above",
    phonetic: "/əˈbʌv/",
    definition: "在...上方",
    example: "The bird flew above the trees.",
    split: "a-bove",
    mnemonic: "a(阿) + bove(love) = 阿在爱上面",
    partOfSpeech: "prep."
  },
  {
    word: "accept",
    phonetic: "/əkˈsept/",
    definition: "接受",
    example: "I accept your invitation.",
    split: "ac-cept",
    mnemonic: "ac(阿克) + cept(sept) = 阿克接受sept",
    partOfSpeech: "v."
  },
  {
    word: "accident",
    phonetic: "/ˈæksɪdənt/",
    definition: "事故，意外",
    example: "He was injured in a car accident.",
    split: "ac-ci-dent",
    mnemonic: "ac(阿克) + ci(西) + dent(登特) = 阿克在西部登特时出事故",
    partOfSpeech: "n."
  },
  {
    word: "achieve",
    phonetic: "/əˈtʃiːv/",
    definition: "实现，达到",
    example: "She worked hard to achieve her goal.",
    split: "a-chieve",
    mnemonic: "a(阿) + chieve(chieve) = 阿实现了chieve",
    partOfSpeech: "v."
  },
  {
    word: "across",
    phonetic: "/əˈkrɔːs/",
    definition: "穿过，横过",
    example: "They walked across the bridge.",
    split: "a-cross",
    mnemonic: "a(阿) + cross(十字) = 阿走过十字路口",
    partOfSpeech: "prep."
  },
  {
    word: "act",
    phonetic: "/ækt/",
    definition: "行动，表演",
    example: "You must act quickly.",
    split: "act",
    mnemonic: "act(爱克特) = 爱克特在行动",
    partOfSpeech: "v."
  },
  {
    word: "action",
    phonetic: "/ˈækʃn/",
    definition: "行动，行动",
    example: "Take action immediately.",
    split: "ac-tion",
    mnemonic: "ac(阿克) + tion(神) = 阿克神的行动",
    partOfSpeech: "n."
  },
  {
    word: "active",
    phonetic: "/ˈæktɪv/",
    definition: "活跃的，积极的",
    example: "She is active in sports.",
    split: "ac-tive",
    mnemonic: "ac(阿克) + tive(踢) = 阿克爱踢球，很活跃",
    partOfSpeech: "adj."
  },
  {
    word: "activity",
    phonetic: "/ækˈtɪvəti/",
    definition: "活动",
    example: "Outdoor activities are good for health.",
    split: "ac-ti-vi-ty",
    mnemonic: "ac(阿克) + ti(提) + vi(微) + ty(体) = 阿克提微体活动",
    partOfSpeech: "n."
  },
  {
    word: "actual",
    phonetic: "/ˈæktʃuəl/",
    definition: "实际的",
    example: "The actual cost was higher than expected.",
    split: "ac-tu-al",
    mnemonic: "ac(阿克) + tu(图) + al(尔) = 阿克图尔实际的",
    partOfSpeech: "adj."
  },
  {
    word: "add",
    phonetic: "/æd/",
    definition: "增加，添加",
    example: "Add some sugar to your coffee.",
    split: "add",
    mnemonic: "add(爱德) = 爱德喜欢添加东西",
    partOfSpeech: "v."
  },
  {
    word: "address",
    phonetic: "/əˈdres/",
    definition: "地址",
    example: "What is your home address?",
    split: "ad-dress",
    mnemonic: "ad(爱德) + dress(裙子) = 爱德穿裙子的地址",
    partOfSpeech: "n."
  },
  {
    word: "advantage",
    phonetic: "/ədˈvæntɪdʒ/",
    definition: "优势，利益",
    example: "Speed is his main advantage.",
    split: "ad-van-tage",
    mnemonic: "ad(爱德) + van(范) + tage(泰姬) = 爱德范泰姬的优势",
    partOfSpeech: "n."
  },
  {
    word: "advice",
    phonetic: "/ədˈvaɪs/",
    definition: "建议，忠告",
    example: "Can you give me some advice?",
    split: "ad-vice",
    mnemonic: "ad(爱德) + vice(歪) = 爱德歪着给建议",
    partOfSpeech: "n."
  },
  {
    word: "advise",
    phonetic: "/ədˈvaɪz/",
    definition: "建议，劝告",
    example: "I advise you to study harder.",
    split: "ad-vise",
    mnemonic: "ad(爱德) + vise(歪) = 爱德歪着给建议",
    partOfSpeech: "v."
  },
  {
    word: "afford",
    phonetic: "/əˈfɔːrd/",
    definition: "买得起，承担得起",
    example: "I can't afford a new car.",
    split: "af-ford",
    mnemonic: "af(爱夫) + ford(福特) = 爱夫买不起福特",
    partOfSpeech: "v."
  },
  {
    word: "afraid",
    phonetic: "/əˈfreɪd/",
    definition: "害怕的",
    example: "Don't be afraid of the dark.",
    split: "af-raid",
    mnemonic: "af(爱夫) + raid(雷德) = 爱夫害怕雷德",
    partOfSpeech: "adj."
  },
  {
    word: "after",
    phonetic: "/ˈæftər/",
    definition: "在...之后",
    example: "Let's meet after lunch.",
    split: "af-ter",
    mnemonic: "af(爱夫) + ter(特) = 爱夫在特之后",
    partOfSpeech: "prep."
  },
  {
    word: "afternoon",
    phonetic: "/ˌæftərˈnuːn/",
    definition: "下午",
    example: "Good afternoon, teacher.",
    split: "af-ter-noon",
    mnemonic: "af(爱夫) + ter(特) + noon(努) = 爱夫特努下午",
    partOfSpeech: "n."
  },
  {
    word: "again",
    phonetic: "/əˈɡen/",
    definition: "再一次，又一次",
    example: "Please read the text again.",
    split: "a-gain",
    mnemonic: "a(阿) + gain(给) = 阿给再一次",
    partOfSpeech: "adv."
  },
  {
    word: "against",
    phonetic: "/əˈɡenst/",
    definition: "反对，倚靠",
    example: "I am against the plan.",
    split: "a-gainst",
    mnemonic: "a(阿) + gain(给) + st(斯特) = 阿给斯特反对",
    partOfSpeech: "prep."
  },
  {
    word: "age",
    phonetic: "/eɪdʒ/",
    definition: "年龄",
    example: "What is your age?",
    split: "age",
    mnemonic: "age(爱姬) = 爱姬的年龄",
    partOfSpeech: "n."
  },
  {
    word: "ago",
    phonetic: "/əˈɡoʊ/",
    definition: "以前",
    example: "I met him two years ago.",
    split: "a-go",
    mnemonic: "a(阿) + go(狗) = 阿的狗以前很乖",
    partOfSpeech: "adv."
  },
  {
    word: "agree",
    phonetic: "/əˈɡriː/",
    definition: "同意",
    example: "I agree with your opinion.",
    split: "a-gree",
    mnemonic: "a(阿) + gree(里) = 阿里同意",
    partOfSpeech: "v."
  },
  {
    word: "agreement",
    phonetic: "/əˈɡriːmənt/",
    definition: "同意，协议",
    example: "We reached an agreement.",
    split: "a-gree-ment",
    mnemonic: "a(阿) + gree(里) + ment(门) = 阿里门的协议",
    partOfSpeech: "n."
  },
  {
    word: "ahead",
    phonetic: "/əˈhed/",
    definition: "在前面，向前",
    example: "Go straight ahead.",
    split: "a-head",
    mnemonic: "a(阿) + head(头) = 阿的头在前面",
    partOfSpeech: "adv."
  },
  {
    word: "aim",
    phonetic: "/eɪm/",
    definition: "目标，瞄准",
    example: "His aim is to become a doctor.",
    split: "aim",
    mnemonic: "aim(爱姆) = 爱姆的目标",
    partOfSpeech: "n."
  },
  {
    word: "air",
    phonetic: "/er/",
    definition: "空气",
    example: "Fresh air is good for health.",
    split: "air",
    mnemonic: "air(爱尔) = 爱尔的空气",
    partOfSpeech: "n."
  },
  {
    word: "airplane",
    phonetic: "/ˈerpleɪn/",
    definition: "飞机",
    example: "The airplane will land soon.",
    split: "air-plane",
    mnemonic: "air(爱尔) + plane(普兰) = 爱尔普兰坐飞机",
    partOfSpeech: "n."
  },
  {
    word: "airport",
    phonetic: "/ˈerpɔːrt/",
    definition: "机场",
    example: "I'll meet you at the airport.",
    split: "air-port",
    mnemonic: "air(爱尔) + port(波特) = 爱尔波特去机场",
    partOfSpeech: "n."
  },
  {
    word: "all",
    phonetic: "/ɔːl/",
    definition: "所有的，全部",
    example: "All students must attend the meeting.",
    split: "all",
    mnemonic: "all(奥) = 奥有全部",
    partOfSpeech: "adj."
  },
  {
    word: "allow",
    phonetic: "/əˈlaʊ/",
    definition: "允许",
    example: "Smoking is not allowed here.",
    split: "al-low",
    mnemonic: "al(奥) + low(楼) = 奥楼允许吸烟",
    partOfSpeech: "v."
  },
  {
    word: "almost",
    phonetic: "/ˈɔːlmoʊst/",
    definition: "几乎，差不多",
    example: "It's almost time to leave.",
    split: "al-most",
    mnemonic: "al(奥) + most(摩斯) = 奥摩斯几乎到了",
    partOfSpeech: "adv."
  },
  {
    word: "alone",
    phonetic: "/əˈloʊn/",
    definition: "单独的，独自",
    example: "She lives alone.",
    split: "a-lone",
    mnemonic: "a(阿) + lone(龙) = 阿龙独自一人",
    partOfSpeech: "adj."
  },
  {
    word: "along",
    phonetic: "/əˈlɔːŋ/",
    definition: "沿着",
    example: "Walk along the river.",
    split: "a-long",
    mnemonic: "a(阿) + long(龙) = 阿龙沿着河走",
    partOfSpeech: "prep."
  },
  {
    word: "already",
    phonetic: "/ɔːlˈredi/",
    definition: "已经",
    example: "I have already finished my homework.",
    split: "al-rea-dy",
    mnemonic: "al(奥) + rea(瑞) + dy(迪) = 奥瑞迪已经完成了",
    partOfSpeech: "adv."
  },
  {
    word: "also",
    phonetic: "/ˈɔːlsoʊ/",
    definition: "也，同样",
    example: "She speaks English and also French.",
    split: "al-so",
    mnemonic: "al(奥) + so(搜) = 奥也搜",
    partOfSpeech: "adv."
  },
  {
    word: "although",
    phonetic: "/ɔːlˈðoʊ/",
    definition: "虽然",
    example: "Although it rained, we went out.",
    split: "al-though",
    mnemonic: "al(奥) + though(搜) = 奥虽然搜到了",
    partOfSpeech: "conj."
  },
  {
    word: "always",
    phonetic: "/ˈɔːlweɪz/",
    definition: "总是，一直",
    example: "He is always late for school.",
    split: "al-ways",
    mnemonic: "al(奥) + ways(卫) = 奥卫总是迟到",
    partOfSpeech: "adv."
  },
  {
    word: "among",
    phonetic: "/əˈmʌŋ/",
    definition: "在...之中",
    example: "She is popular among her classmates.",
    split: "a-mong",
    mnemonic: "a(阿) + mong(梦) = 阿梦在同学之中",
    partOfSpeech: "prep."
  },
  {
    word: "amount",
    phonetic: "/əˈmaʊnt/",
    definition: "数量，总计",
    example: "A large amount of money was stolen.",
    split: "a-mount",
    mnemonic: "a(阿) + mount(山) = 阿山数量很大",
    partOfSpeech: "n."
  },
  {
    word: "ancient",
    phonetic: "/ˈeɪnʃənt/",
    definition: "古代的",
    example: "This is an ancient city.",
    split: "an-cient",
    mnemonic: "an(安) + cient(森特) = 安森特是古代人",
    partOfSpeech: "adj."
  },
  {
    word: "anger",
    phonetic: "/ˈæŋɡər/",
    definition: "愤怒",
    example: "He couldn't control his anger.",
    split: "an-ger",
    mnemonic: "an(安) + ger(哥) = 安哥很愤怒",
    partOfSpeech: "n."
  },
  {
    word: "angry",
    phonetic: "/ˈæŋɡri/",
    definition: "生气的",
    example: "Don't be angry with me.",
    split: "an-gry",
    mnemonic: "an(安) + gry(哥) = 安哥很生气",
    partOfSpeech: "adj."
  },
  {
    word: "animal",
    phonetic: "/ˈænɪml/",
    definition: "动物",
    example: "Dogs are loyal animals.",
    split: "an-i-mal",
    mnemonic: "an(安) + i(爱) + mal(妈) = 安爱妈像动物",
    partOfSpeech: "n."
  },
  {
    word: "another",
    phonetic: "/əˈnʌðər/",
    definition: "另一个，又一个",
    example: "I need another cup of coffee.",
    split: "an-oth-er",
    mnemonic: "an(安) + oth(奥) + er(尔) = 安奥尔另一个",
    partOfSpeech: "adj."
  },
  {
    word: "answer",
    phonetic: "/ˈænsər/",
    definition: "回答，答案",
    example: "Please answer the question.",
    split: "an-swer",
    mnemonic: "an(安) + swer(斯威) = 安斯威回答",
    partOfSpeech: "n."
  },
  {
    word: "anxious",
    phonetic: "/ˈæŋkʃəs/",
    definition: "焦虑的",
    example: "She felt anxious about the exam.",
    split: "an-xious",
    mnemonic: "an(安) + xious(肖斯) = 安肖斯很焦虑",
    partOfSpeech: "adj."
  },
  {
    word: "any",
    phonetic: "/ˈeni/",
    definition: "任何的，一些",
    example: "Do you have any questions?",
    split: "any",
    mnemonic: "any(安尼) = 安尼有任何问题",
    partOfSpeech: "adj."
  },
  {
    word: "anybody",
    phonetic: "/ˈenibɑːdi/",
    definition: "任何人",
    example: "Anybody can learn to swim.",
    split: "any-bo-dy",
    mnemonic: "any(安尼) + bo(博) + dy(迪) = 安尼博迪任何人",
    partOfSpeech: "pron."
  },
  {
    word: "anyone",
    phonetic: "/ˈeniwʌn/",
    definition: "任何人",
    example: "Is anyone here?",
    split: "any-one",
    mnemonic: "any(安尼) + one(万) = 安尼万任何人",
    partOfSpeech: "pron."
  },
  {
    word: "anything",
    phonetic: "/ˈeniθɪŋ/",
    definition: "任何事物",
    example: "I can do anything for you.",
    split: "any-thing",
    mnemonic: "any(安尼) + thing(辛) = 安尼辛任何事物",
    partOfSpeech: "pron."
  },
  {
    word: "anyway",
    phonetic: "/ˈeniweɪ/",
    definition: "无论如何",
    example: "It's too late anyway.",
    split: "any-way",
    mnemonic: "any(安尼) + way(卫) = 安尼卫无论如何",
    partOfSpeech: "adv."
  },
  {
    word: "anywhere",
    phonetic: "/ˈeniwer/",
    definition: "任何地方",
    example: "I can't find my keys anywhere.",
    split: "any-where",
    mnemonic: "any(安尼) + where(魏) = 安尼魏在任何地方",
    partOfSpeech: "adv."
  },
  {
    word: "appear",
    phonetic: "/əˈpɪr/",
    definition: "出现，似乎",
    example: "The sun appeared from behind the clouds.",
    split: "ap-pear",
    mnemonic: "ap(爱普) + pear(佩尔) = 爱普佩尔出现",
    partOfSpeech: "v."
  },
  {
    word: "apple",
    phonetic: "/ˈæpl/",
    definition: "苹果",
    example: "An apple a day keeps the doctor away.",
    split: "ap-ple",
    mnemonic: "ap(爱普) + ple(普) = 爱普普吃苹果",
    partOfSpeech: "n."
  },
  {
    word: "area",
    phonetic: "/ˈeriə/",
    definition: "区域，面积",
    example: "This is a residential area.",
    split: "ar-ea",
    mnemonic: "ar(阿) + ea(伊) = 阿伊区域",
    partOfSpeech: "n."
  },
  {
    word: "argue",
    phonetic: "/ˈɑːrɡjuː/",
    definition: "争论，辩论",
    example: "Don't argue with your parents.",
    split: "ar-gue",
    mnemonic: "ar(阿) + gue(格) = 阿格争论",
    partOfSpeech: "v."
  },
  {
    word: "arm",
    phonetic: "/ɑːrm/",
    definition: "手臂，武装",
    example: "She broke her arm in the accident.",
    split: "arm",
    mnemonic: "arm(阿姆) = 阿姆的手臂",
    partOfSpeech: "n."
  },
  {
    word: "army",
    phonetic: "/ˈɑːrmi/",
    definition: "军队",
    example: "He joined the army last year.",
    split: "ar-my",
    mnemonic: "ar(阿) + my(迈) = 阿迈军队",
    partOfSpeech: "n."
  },
  {
    word: "around",
    phonetic: "/əˈraʊnd/",
    definition: "在周围，大约",
    example: "Let's walk around the park.",
    split: "a-round",
    mnemonic: "a(阿) + round(绕) = 阿绕着周围走",
    partOfSpeech: "prep."
  },
  {
    word: "arrive",
    phonetic: "/əˈraɪv/",
    definition: "到达",
    example: "We arrived at the hotel at 6 PM.",
    split: "ar-rive",
    mnemonic: "ar(阿) + rive(瑞) = 阿瑞到达",
    partOfSpeech: "v."
  },
  {
    word: "art",
    phonetic: "/ɑːrt/",
    definition: "艺术，美术",
    example: "She is interested in art.",
    split: "art",
    mnemonic: "art(阿特) = 阿特爱艺术",
    partOfSpeech: "n."
  },
  {
    word: "article",
    phonetic: "/ˈɑːrtɪkl/",
    definition: "文章，物品",
    example: "I read an interesting article today.",
    split: "ar-ti-cle",
    mnemonic: "ar(阿) + ti(提) + cle(克) = 阿提克的文章",
    partOfSpeech: "n."
  },
  {
    word: "artist",
    phonetic: "/ˈɑːrtɪst/",
    definition: "艺术家",
    example: "He is a famous artist.",
    split: "ar-tist",
    mnemonic: "ar(阿) + tist(提斯特) = 阿提斯特艺术家",
    partOfSpeech: "n."
  },
  {
    word: "as",
    phonetic: "/æz/",
    definition: "如同，作为",
    example: "Work hard as a student.",
    split: "as",
    mnemonic: "as(阿斯) = 阿斯作为学生",
    partOfSpeech: "conj."
  },
  {
    word: "ask",
    phonetic: "/æsk/",
    definition: "问，请求",
    example: "Ask the teacher for help.",
    split: "ask",
    mnemonic: "ask(阿斯克) = 阿斯克问问题",
    partOfSpeech: "v."
  },
  {
    word: "asleep",
    phonetic: "/əˈsliːp/",
    definition: "睡着的",
    example: "The baby is asleep.",
    split: "a-sleep",
    mnemonic: "a(阿) + sleep(斯利) = 阿斯利睡着了",
    partOfSpeech: "adj."
  },
  {
    word: "at",
    phonetic: "/æt/",
    definition: "在...，在...时刻",
    example: "Meet me at the station at 5 PM.",
    split: "at",
    mnemonic: "at(爱特) = 爱特在车站",
    partOfSpeech: "prep."
  },
  {
    word: "attention",
    phonetic: "/əˈtenʃn/",
    definition: "注意，关注",
    example: "Please pay attention to the teacher.",
    split: "at-ten-tion",
    mnemonic: "at(爱特) + ten(腾) + tion(神) = 爱特腾神的注意",
    partOfSpeech: "n."
  },
  {
    word: "attract",
    phonetic: "/əˈtrækt/",
    definition: "吸引",
    example: "The flowers attract bees.",
    split: "at-tract",
    mnemonic: "at(爱特) + tract(特瑞克) = 爱特特瑞克吸引",
    partOfSpeech: "v."
  },
  {
    word: "aunt",
    phonetic: "/ænt/",
    definition: "阿姨，姑妈",
    example: "My aunt lives in New York.",
    split: "aunt",
    mnemonic: "aunt(安特) = 安特阿姨",
    partOfSpeech: "n."
  },
  {
    word: "autumn",
    phonetic: "/ˈɔːtəm/",
    definition: "秋天",
    example: "Leaves fall in autumn.",
    split: "au-tumn",
    mnemonic: "au(奥) + tumn(特姆) = 奥特姆在秋天",
    partOfSpeech: "n."
  },
  {
    word: "available",
    phonetic: "/əˈveɪləbl/",
    definition: "可用的，有空的",
    example: "The manager is not available now.",
    split: "a-vail-a-ble",
    mnemonic: "a(阿) + vail(威尔) + a(阿) + ble(百) = 阿威尔阿百可用",
    partOfSpeech: "adj."
  },
  {
    word: "avoid",
    phonetic: "/əˈvɔɪd/",
    definition: "避免",
    example: "You should avoid eating too much sugar.",
    split: "a-void",
    mnemonic: "a(阿) + void(沃德) = 阿沃德避免",
    partOfSpeech: "v."
  },
  {
    word: "awake",
    phonetic: "/əˈweɪk/",
    definition: "醒着的",
    example: "I am still awake.",
    split: "a-wake",
    mnemonic: "a(阿) + wake(维克) = 阿维克醒着",
    partOfSpeech: "adj."
  },
  {
    word: "away",
    phonetic: "/əˈweɪ/",
    definition: "离开，远离",
    example: "He went away yesterday.",
    split: "a-way",
    mnemonic: "a(阿) + way(卫) = 阿卫离开了",
    partOfSpeech: "adv."
  },
  {
    word: "baby",
    phonetic: "/ˈbeɪbi/",
    definition: "婴儿",
    example: "The baby is crying.",
    split: "ba-by",
    mnemonic: "ba(爸) + by(比) = 爸比的婴儿",
    partOfSpeech: "n."
  },
  {
    word: "back",
    phonetic: "/bæk/",
    definition: "后面，背部，后面的",
    example: "Sit back and relax.",
    split: "back",
    mnemonic: "back(拜克) = 拜克的背后",
    partOfSpeech: "n."
  },
  {
    word: "bad",
    phonetic: "/bæd/",
    definition: "坏的，糟糕的",
    example: "The weather is bad today.",
    split: "bad",
    mnemonic: "bad(拜德) = 拜德今天很坏",
    partOfSpeech: "adj."
  },
  {
    word: "bag",
    phonetic: "/bæɡ/",
    definition: "包，袋子",
    example: "Put your books in your bag.",
    split: "bag",
    mnemonic: "bag(拜格) = 拜格的包",
    partOfSpeech: "n."
  },
  {
    word: "ball",
    phonetic: "/bɔːl/",
    definition: "球",
    example: "Let's play basketball.",
    split: "ball",
    mnemonic: "ball(宝) = 宝的球",
    partOfSpeech: "n."
  },
  {
    word: "bank",
    phonetic: "/bæŋk/",
    definition: "银行，河岸",
    example: "I need to go to the bank.",
    split: "bank",
    mnemonic: "bank(班克) = 班克去银行",
    partOfSpeech: "n."
  },
  {
    word: "basic",
    phonetic: "/ˈbeɪsɪk/",
    definition: "基本的",
    example: "This is a basic question.",
    split: "ba-sic",
    mnemonic: "ba(爸) + sic(西克) = 爸西克基本问题",
    partOfSpeech: "adj."
  },
  {
    word: "basket",
    phonetic: "/ˈbæskɪt/",
    definition: "篮子",
    example: "She bought a basket of fruit.",
    split: "bas-ket",
    mnemonic: "bas(巴斯) + ket(凯特) = 巴斯凯特的篮子",
    partOfSpeech: "n."
  },
  {
    word: "basketball",
    phonetic: "/ˈbæskɪtbɔːl/",
    definition: "篮球",
    example: "He plays basketball every weekend.",
    split: "bas-ket-ball",
    mnemonic: "bas(巴斯) + ket(凯特) + ball(宝) = 巴斯凯特宝打篮球",
    partOfSpeech: "n."
  },
  {
    word: "be",
    phonetic: "/biː/",
    definition: "是，存在",
    example: "Be careful!",
    split: "be",
    mnemonic: "be(必) = 必须是",
    partOfSpeech: "v."
  },
  {
    word: "beat",
    phonetic: "/biːt/",
    definition: "打败，敲打",
    example: "Our team beat theirs easily.",
    split: "beat",
    mnemonic: "beat(比特) = 比特打败了",
    partOfSpeech: "v."
  },
  {
    word: "beautiful",
    phonetic: "/ˈbjuːtɪfl/",
    definition: "美丽的",
    example: "The sunset is beautiful.",
    split: "beau-ti-ful",
    mnemonic: "beau(宝) + ti(提) + ful(弗) = 宝提弗美丽",
    partOfSpeech: "adj."
  },
  {
    word: "because",
    phonetic: "/bɪˈkɔːz/",
    definition: "因为",
    example: "I stayed home because I was sick.",
    split: "be-cause",
    mnemonic: "be(必) + cause(考斯) = 必考斯因为",
    partOfSpeech: "conj."
  },
  {
    word: "become",
    phonetic: "/bɪˈkʌm/",
    definition: "变成，成为",
    example: "He wants to become a teacher.",
    split: "be-come",
    mnemonic: "be(必) + come(卡姆) = 必卡姆成为",
    partOfSpeech: "v."
  },
  {
    word: "bed",
    phonetic: "/bed/",
    definition: "床",
    example: "Go to bed early.",
    split: "bed",
    mnemonic: "bed(拜德) = 拜德的床",
    partOfSpeech: "n."
  },
  {
    word: "bedroom",
    phonetic: "/ˈbedruːm/",
    definition: "卧室",
    example: "My bedroom is on the second floor.",
    split: "bed-room",
    mnemonic: "bed(拜德) + room(鲁姆) = 拜德鲁姆的卧室",
    partOfSpeech: "n."
  },
  {
    word: "before",
    phonetic: "/bɪˈfɔːr/",
    definition: "在...之前",
    example: "Clean your room before dinner.",
    split: "be-fore",
    mnemonic: "be(必) + fore(佛) = 必佛在之前",
    partOfSpeech: "prep."
  },
  {
    word: "begin",
    phonetic: "/bɪˈɡɪn/",
    definition: "开始",
    example: "The meeting will begin soon.",
    split: "be-gin",
    mnemonic: "be(必) + gin(金) = 必金开始",
    partOfSpeech: "v."
  },
  {
    word: "behavior",
    phonetic: "/bɪˈheɪvjər/",
    definition: "行为",
    example: "His behavior is unacceptable.",
    split: "be-hav-ior",
    mnemonic: "be(必) + hav(哈) + ior(伊尔) = 必哈伊尔的行为",
    partOfSpeech: "n."
  },
  {
    word: "behind",
    phonetic: "/bɪˈhaɪnd/",
    definition: "在...后面",
    example: "The dog is behind the tree.",
    split: "be-hind",
    mnemonic: "be(必) + hind(海德) = 必海德在后面",
    partOfSpeech: "prep."
  }
];

/**
 * 导入高频100词到数据库
 * 1. 创建"高频100词"词库
 * 2. 插入100个单词
 * 3. 将单词与词库关联
 */
export async function importHighFrequencyWords(): Promise<void> {
  try {
    console.log('开始导入高频100词...');
    
    // 初始化数据库
    await initDatabase();
    const db = getDatabase();
    
    // 检查"高频100词"词库是否已存在
    const existingBook = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM wordbooks WHERE name = '高频100词'"
    );
    
    let wordbookId: number;
    
    if (existingBook) {
      console.log('词库"高频100词"已存在，跳过创建');
      wordbookId = existingBook.id;
    } else {
      // 创建"高频100词"词库
      console.log('创建"高频100词"词库...');
      const result = await createWordbook('高频100词', '高中高频英语单词前100个');
      wordbookId = result;
      console.log('词库创建成功，ID:', wordbookId);
    }
    
    // 批量插入单词
    console.log('插入100个单词...');
    const wordIds: number[] = [];
    
    for (const wordData of HIGH_FREQUENCY_WORDS) {
      // 检查单词是否已存在
      const existingWord = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM words WHERE word = ?",
        [wordData.word]
      );
      
      let wordId: number;
      
      if (existingWord) {
        console.log(`单词 "${wordData.word}" 已存在，跳过`);
        wordId = existingWord.id;
      } else {
        // 插入新单词
        const insertResult = await db.runAsync(
          `INSERT INTO words (
            word, phonetic, definition, partOfSpeech, split, mnemonic, sentence,
            difficulty, stability, avg_response_time, is_mastered, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            wordData.word,
            wordData.phonetic,
            wordData.definition,
            wordData.partOfSpeech,
            wordData.split,
            wordData.mnemonic,
            wordData.example,
            0.5,  // 默认难度（中等）
            0,    // 初始稳定性
            0,    // 初始平均响应时间
            0,    // 未掌握
            new Date().toISOString()
          ]
        );
        wordId = insertResult.lastInsertRowId;
        console.log(`插入单词 "${wordData.word}"，ID: ${wordId}`);
      }
      
      wordIds.push(wordId);
    }
    
    // 将单词与词库关联
    console.log(`将${wordIds.length}个单词与词库关联...`);
    await addWordsToWordbook(wordbookId, wordIds);
    
    console.log('✅ 高频100词导入完成！');
    console.log(`词库ID: ${wordbookId}`);
    console.log(`单词数量: ${wordIds.length}`);
    
  } catch (error) {
    console.error('导入失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行导入
if (require.main === module) {
  importHighFrequencyWords()
    .then(() => {
      console.log('导入成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('导入失败:', error);
      process.exit(1);
    });
}
