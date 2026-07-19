const QUESTIONS = [
  { id: "lf01", axis: "lf", reverse: false, text: "二人の時間は、自分がリードして流れを作るほうが落ち着く。" },
  { id: "lf02", axis: "lf", reverse: false, text: "始める前のルールや段取りは、自分から提案したい。" },
  { id: "lf03", axis: "lf", reverse: true, text: "信頼できる相手になら、進め方をすべて委ねても安心できる。" },
  { id: "lf04", axis: "lf", reverse: false, text: "相手が迷っているときは、選択肢を示して導く役になりやすい。" },
  { id: "lf05", axis: "lf", reverse: true, text: "自分で決めるより、相手から明確な指示をもらうほうが集中できる。" },
  { id: "lf06", axis: "lf", reverse: false, text: "二人だけの約束ごとを考え、続けやすい形に整えるのが好きだ。" },
  { id: "lf07", axis: "lf", reverse: true, text: "流れを相手に預け、自分はその場の感覚に身を任せたい。" },
  { id: "lf08", axis: "lf", reverse: false, text: "相手の様子を見ながら、次に何をするか判断する役が合っている。" },
  { id: "lf09", axis: "lf", reverse: true, text: "役割を選べるなら、導く側よりついていく側を選ぶことが多い。" },

  { id: "gt01", axis: "gt", reverse: false, text: "相手の反応を見ながら刺激を与えることに、好奇心を感じる。" },
  { id: "gt02", axis: "gt", reverse: true, text: "強めの刺激や痛みを『受ける』ことに惹かれる。" },
  { id: "gt03", axis: "gt", reverse: false, text: "相手にどんな刺激が合うか、試しながら見つけたい。" },
  { id: "gt04", axis: "gt", reverse: true, text: "自分から働きかけるより、相手の働きかけを受け止めたい。" },
  { id: "gt05", axis: "gt", reverse: false, text: "相手の限界を守りながら、反応を引き出す役に魅力を感じる。" },
  { id: "gt06", axis: "gt", reverse: false, text: "刺激の種類や強さを組み立てる側に回ると、気持ちが高まる。" },
  { id: "gt07", axis: "gt", reverse: true, text: "自分が刺激を受け、相手に反応を見てもらう状況が好きだ。" },
  { id: "gt08", axis: "gt", reverse: false, text: "相手に合わせて刺激のペースを変えることを楽しめる。" },
  { id: "gt09", axis: "gt", reverse: true, text: "与える役よりも、受ける役のほうが自然体でいられる。" },

  { id: "rp01", axis: "rp", reverse: false, text: "こうした関係は、恋愛や信頼の延長線上にあってほしい。" },
  { id: "rp02", axis: "rp", reverse: true, text: "親密な時間と日常の関係は、はっきり分けておきたい。" },
  { id: "rp03", axis: "rp", reverse: false, text: "二人の間に育つ物語や、長く続くつながりを大切にしたい。" },
  { id: "rp04", axis: "rp", reverse: true, text: "その時間を楽しめれば、日常で特別な関係になる必要はない。" },
  { id: "rp05", axis: "rp", reverse: false, text: "役割や約束は、普段の信頼関係にも少しつながっていてほしい。" },
  { id: "rp06", axis: "rp", reverse: false, text: "相手への気持ちが深まるほど、親密な時間も満たされやすい。" },
  { id: "rp07", axis: "rp", reverse: true, text: "気持ちの深さより、その場の相性や楽しさを優先したい。" },
  { id: "rp08", axis: "rp", reverse: false, text: "終わったあとも、相手とのつながりを感じられる時間がほしい。" },
  { id: "rp09", axis: "rp", reverse: true, text: "親密な遊びは、恋愛とは別のものとして気軽に扱いたい。" },

  { id: "cd01", axis: "cd", reverse: false, text: "相手が満たされている姿を見ることが、自分のいちばんの満足になる。" },
  { id: "cd02", axis: "cd", reverse: true, text: "まず自分の望みが満たされることを、素直に大切にしたい。" },
  { id: "cd03", axis: "cd", reverse: false, text: "自分の楽しみより、相手が安心して楽しめているかが気になる。" },
  { id: "cd04", axis: "cd", reverse: true, text: "相手に合わせ続けるより、自分の欲求をはっきり優先したい。" },
  { id: "cd05", axis: "cd", reverse: false, text: "相手の好みを覚え、喜ぶ形で応えられるとうれしい。" },
  { id: "cd06", axis: "cd", reverse: false, text: "二人の満足が違うときは、まず相手の希望を聞きたくなる。" },
  { id: "cd07", axis: "cd", reverse: true, text: "求めるものは遠慮せず伝え、相手にも応えてほしいと思う。" },
  { id: "cd08", axis: "cd", reverse: false, text: "終わったあとの相手の気分まで見届けることを大切にしたい。" },
  { id: "cd09", axis: "cd", reverse: true, text: "気遣いだけで終わるより、自分の望みを十分にかなえたい。" },

  { id: "i01", axis: "i", reverse: false, text: "刺激は、軽いものより深く強いものに惹かれる。" },
  { id: "i02", axis: "i", reverse: false, text: "慣れてきたら、時間をかけて強度を高めてみたい。" },
  { id: "i03", axis: "i", reverse: false, text: "穏やかなやり取りだけでは、少し物足りなく感じることがある。" },
  { id: "i04", axis: "i", reverse: false, text: "安全な範囲を相談したうえで、濃く没入する体験に惹かれる。" }
];

window.QUESTIONS = QUESTIONS;
