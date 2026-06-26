const UNITS = [
{u:1,t:"A new friend at university",task:"Write an email to an English friend. Say who you met, describe the person, and ask a question.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

Last week I met a new friend at university. Her name is Anna and she is very kind. She usually wears jeans and a colourful shirt, but yesterday she wore a beautiful dress because we went to a party. We talked about music, films and sport. I think she is one of the nicest people in my class. Next weekend we are going to study together, and maybe we will go for a coffee after the lesson. Have you made any new friends this year?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:2,t:"A photo competition",task:"Tell your friend about a photo competition. Say what you photographed, what happened, and ask a question.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

I have just taken part in a photo competition at school. I took a picture of my town while the sun was going down. It was difficult because there were many people in the street, but in the end the photo was really good. I haven't won yet, but my teacher said that my picture was interesting. If I win, I will buy a new camera. Have you ever taken part in a competition like this?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:3,t:"A new restaurant",task:"Write about a new restaurant. Describe food, service, price and invite your friend.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

Yesterday I went to a new Italian restaurant with my family. The place was small but very nice. I ordered pasta with tomato sauce and my sister had pizza. The waiter was friendly and the food was delicious. It wasn't too expensive, so I think we should go there together one day. I have never eaten such good pasta in my town. If you come next weekend, we can have dinner there. What kind of food do you like best?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:4,t:"A car accident",task:"Tell your friend about a small accident after a party. Explain what happened and how you felt.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

Last Saturday I went to a birthday party with my friends. While I was going home, a car suddenly stopped in front of me. I was driving slowly, so nobody was hurt, but my car was damaged. I felt really scared and worried. A police officer arrived after ten minutes and helped us. Now the car is at the garage, but I am fine. I think I will be more careful in the future. Have you ever had an accident?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:5,t:"A trip to London",task:"Tell your friend about a trip. Mention transport, hotel, places and advice.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

I have just come back from London. I went there by plane with two friends. The flight was short, but our luggage arrived late, so we were a little worried. Our hotel was near the centre and it was comfortable enough. We visited the British Museum, walked near the river and bought some souvenirs. London is more expensive than my town, but it is one of the most exciting cities I have ever visited. If you go there, you should take an umbrella. Where would you like to travel next?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:6,t:"A new smartphone",task:"Write about a new phone or technology. Say why you bought it and what you use it for.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

I bought a new smartphone two days ago because my old one was too slow. This phone is faster and the camera is much better. I use it to study English, listen to music and send messages to my friends. I have already downloaded a useful app which helps me learn new words. I think technology can make life easier, but we shouldn't use our phones all day. Tomorrow I am going to take some photos in the park. Do you use any good apps for studying?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:7,t:"A healthier life",task:"Give advice to a friend who wants to be healthier.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

I'm happy you want to have a healthier life. If I were you, I would eat more fruit and vegetables and drink a lot of water. You shouldn't eat too many sweets, and you should do some sport twice a week. Last year I used to stay at home all afternoon, but now I go running with my cousin. At first it was hard, but now I feel better and I sleep more. If you start slowly, you will not get tired. What sport would you like to try?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:8,t:"A football match",task:"Tell your friend about a match or film. Say what happened and give your opinion.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

Yesterday evening I watched a football match with my brother. Our team played very well in the first half, but the other team scored after twenty minutes. While everyone was shouting, our best player scored a fantastic goal. In the end we won 2-1. It was the most exciting match I have seen this year. The stadium was very crowded, but our seats were good enough. Next time you should come with us. Do you prefer watching sport at home or at the stadium?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:9,t:"A job interview",task:"Write about your first job interview. Explain questions, feelings and result.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

Yesterday I had my first job interview in a clothes shop. I was very nervous before it, but the manager was kind. She asked me why I wanted the job and what I could do well. I said that I am friendly, organised and good with people. I have never worked in a shop before, but I have helped my uncle in his office. They will call me next week. If they choose me, I will work on Saturdays. Have you ever had a job interview?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:10,t:"Lost wallet",task:"Tell your friend about losing your wallet on holiday and how you solved the problem.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

Last month, while I was on holiday, I lost my wallet at the train station. I had some money and my student card inside, so I was very worried. I went to the information office and explained the problem. Luckily, a woman had found it near a ticket machine and gave it to the police. I was so happy because nothing was missing. Since that day, I have always kept my wallet in a safer place. What would you do in this situation?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:11,t:"A festival in another country",task:"Describe a festival or tradition in another country.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

Last summer I visited Spain and went to a local festival. People wore traditional clothes and danced in the main square. There was a lot of music, and everyone was very friendly. I tried some local food which was different from Italian food, but it was tasty. I didn't understand everything people said, but a girl who spoke English helped me. It was a wonderful experience because I learnt something about another culture. If you visited my country, I would show you our best traditions. What festival would you like to see?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`},
{u:12,t:"Going to the doctor",task:"Tell your friend you were ill. Say what happened, what the doctor said, and ask for advice.",model:`Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

I haven't been very well this week. On Monday I had a headache and a sore throat, so I went to the doctor. He said I had to stay at home for three days and drink a lot of water. I also had to take some medicine after lunch and dinner. I was bored because I couldn't go out, but I watched a funny series and read a book. Now I feel much better, although I am still a bit tired. Do you know any good ways to feel stronger after being ill?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`}
];