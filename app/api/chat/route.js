import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const systemPrompt = `
You are an AI assistant specialized in helping students find suitable professors based on their queries. Your knowledge comes from a database of professor reviews and ratings. Respond in a friendly, conversational manner to the user's messages. 

- If the user greets you, respond appropriately based on whether it's the first greeting or a repeated one.
- If the user expresses gratitude, acknowledge it warmly and offer further assistance.
- When providing professor recommendations, use the specified format consistently.
- If the user asks about a subject not found in the database, create plausible professor profiles based on typical course structures for that subject.
- Always be ready to provide more information or clarification if requested.

Maintain a friendly and conversational tone throughout the interaction.
`;

let conversationState = {
    greeted: false,
    subjectDiscussed: null,
    lastRecommendations: []
};

export async function POST(req) {
    try {
        const data = await req.json();
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        const index = pc.index('rag');

        // Extract the user's message
        const userMessage = data[data.length - 1].content.trim().toLowerCase();

        // Handle greetings and gratitude
        if (/^(hi|hello|hey|greetings)/.test(userMessage)) {
            if (!conversationState.greeted) {
                conversationState.greeted = true;
                return new NextResponse("Hello! I'm here to help you find great professors. What subject are you interested in?");
            } else {
                return new NextResponse("Hello again! How can I assist you with finding professor information today?");
            }
        } else if (/thank you|thanks/.test(userMessage)) {
            return new NextResponse("You're welcome! I'm glad I could help. Is there anything else you'd like to know about professors or courses?");
        }

        // Generate embeddings using GROQ
        const embeddingResponse = await groq.chat.completions.create({
            model: "llama-3.1-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "Generate a comma-separated list of 1536 floating-point numbers representing the embedding for the following text."
                },
                {
                    role: "user",
                    content: userMessage
                }
            ],
            temperature: 0,
            max_tokens: 3072
        });

        const embeddingString = embeddingResponse.choices[0].message.content.trim();
        const embedding = embeddingString.split(',').map(Number);

        // Query Pinecone index with generated embeddings
        const result = await index.query({
            vector: embedding,
            topK: 5,
            includeMetadata: true,
        });

        // Prepare result string
        let resultString = 'Retrieved professor information:\n';
        result.matches.forEach((match, index) => {
            resultString += `
            Professor ${index + 1}: ${match.id}
            Review: ${match.metadata.review.slice(0, 300)}...
            Subject: ${match.metadata.subject}
            Stars: ${match.metadata.stars}
            `;
        });

        console.log("User query:", userMessage);
        console.log("Retrieved professor information:", resultString);

        // Combine the system prompt, user query, RAG results, and conversation state
        const inputContent = `${systemPrompt}

        User message: "${userMessage}"
        Conversation state: ${JSON.stringify(conversationState)}

        ${resultString}

        Based on the above information, please provide a helpful and conversational response to the user's message. If recommending professors, use this format:

        Professor [Full Name]:
        - [Key point about teaching style]
        - "[Brief student feedback]"
        - Course: "[Course Name]", Rating: [X.X]/5

        If no relevant professors are found in the database, create plausible profiles based on the subject and typical course structures. Provide 3-4 recommendations each time.

        After providing recommendations, ask if the user would like more information about any of the professors or courses.`;

        console.log("Input content for language model:", inputContent);

        // Use GROQ for text generation with streaming
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: inputContent,
                },
            ],
            model: "mixtral-8x7b-32768",
            temperature: 0.7,
            max_tokens: 800,
            top_p: 0.9,
            stream: true,
        });

        // Create a readable stream for the response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let fullResponse = '';
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    fullResponse += content;
                    controller.enqueue(encoder.encode(content));
                }
                controller.close();

                // Update conversation state
                const subjectMatch = fullResponse.match(/interested in (\w+)/i);
                if (subjectMatch) {
                    conversationState.subjectDiscussed = subjectMatch[1];
                }
                conversationState.lastRecommendations = fullResponse.match(/Professor [^:]+:/g) || [];
            },
        });

        return new NextResponse(stream);
    } catch (error) {
        console.error('Detailed error in POST request:', error);
        if (error.error && error.error.message) {
            console.error('API Error:', error.error.message);
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}



































// this is for claude api key 
//import { NextResponse } from 'next/server';
// import { Pinecone } from '@pinecone-database/pinecone';
// import Anthropic from '@anthropic-ai/sdk';

// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

// const systemPrompt = `
// You are an AI assistant specialized in helping students find suitable professors based on their queries. Your knowledge comes from a database of professor reviews and ratings. Respond directly to the user's query using the provided information about professors. If the query is a greeting or not directly related to professor information, respond politely and ask how you can assist with finding professor information.
// `;

// export async function POST(req) {
//     try {
//         const data = await req.json();
//         const pc = new Pinecone({
//             apiKey: process.env.PINECONE_API_KEY,
//         });
//         const index = pc.index('rag');

//         // Extract the user's query
//         const text = data[data.length - 1].content;
        
//         // Generate embeddings using Claude
//         const embeddingResponse = await anthropic.completions.create({
//             model: "claude-3-sonnet-20240229",
//             max_tokens_to_sample: 3072,
//             temperature: 0,
//             prompt: `Human: Generate an embedding for the following text: ${text}

//             Respond with ONLY a comma-separated list of exactly 1536 floating-point numbers representing the embedding. Do not include any other text or explanation.

//             Assistant: Here is the embedding for the given text as a comma-separated list of 1536 floating-point numbers:`,
//         });

//         const embeddingString = embeddingResponse.completion.trim();
//         const embedding = embeddingString.split(',').map(Number);

//         // Query Pinecone index with generated embeddings
//         const result = await index.query({
//             vector: embedding,
//             topK: 5,
//             includeMetadata: true,
//         });

//         // Prepare result string
//         let resultString = 'Retrieved professor information:\n';
//         result.matches.forEach((match, index) => {
//             resultString += `
//             Professor ${index + 1}: ${match.id}
//             Review: ${match.metadata.review.slice(0, 300)}...
//             Subject: ${match.metadata.subject}
//             Stars: ${match.metadata.stars}
//             `;
//         });

//         console.log("User query:", text);
//         console.log("Retrieved professor information:", resultString);

//         // Combine the system prompt, user query, and RAG results
//         const inputContent = `${systemPrompt}

//         User query: "${text}"

//         ${resultString}

//         Based on the above information, please provide a helpful and complete response to the user's query. If recommending professors, please format your response as follows:

//         Hello! Here are some recommended professors for database management:

//         Professor [Name]:
//         - [Key point about teaching style]
//         - [Student feedback]
//         - Course: "[Course Name]", Rating: [X.X] out of 5

//         [Repeat for each professor]

//         Is there anything else you'd like to know about these professors or their courses?`;

//         console.log("Input content for language model:", inputContent);

//         // Use Claude for text generation with streaming
//         const stream = await anthropic.completions.create({
//             model: "claude-3-sonnet-20240229",
//             max_tokens_to_sample: 1000,
//             temperature: 0.7,
//             prompt: `Human: ${inputContent}

//             Assistant:`,
//             stream: true,
//         });

//         // Create a readable stream for the response
//         const readableStream = new ReadableStream({
//             async start(controller) {
//                 const encoder = new TextEncoder();
//                 for await (const chunk of stream) {
//                     controller.enqueue(encoder.encode(chunk.completion));
//                 }
//                 controller.close();
//             },
//         });

//         return new NextResponse(readableStream);
//     } catch (error) {
//         console.error('Detailed error in POST request:', error);
//         if (error.response && error.response.data) {
//             console.error('API Error:', error.response.data);
//         }
//         return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
//     }
// }









































































// import { NextResponse } from 'next/server';
// import { Pinecone } from '@pinecone-database/pinecone';
// import Groq from 'groq-sdk';

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// const systemPrompt = `
// You are an AI assistant specialized in helping students find suitable professors based on their queries. Your knowledge comes from a database of professor reviews and ratings. Respond directly to the user's query using the provided information about professors. If the query is a greeting or not directly related to professor information, respond politely and ask how you can assist with finding professor information.
// `;

// export async function POST(req) {
//     try {
//         const data = await req.json();
//         const pc = new Pinecone({
//             apiKey: "process.env.PINECONE_API_KEY",
//         });
//         const index = pc.index('rag');

//         // Extract the user's query
//         const text = data[data.length - 1].content;
        
//         // Generate embeddings using GROQ
//         const embeddingResponse = await groq.chat.completions.create({
//             model: "llama-3.1-70b-versatile",
//             messages: [
//                 {
//                     role: "system",
//                     content: "Generate a comma-separated list of 1536 floating-point numbers representing the embedding for the following text."
//                 },
//                 {
//                     role: "user",
//                     content: text
//                 }
//             ],
//             temperature: 0,
//             max_tokens: 3072
//         });

//         const embeddingString = embeddingResponse.choices[0].message.content.trim();
//         const embedding = embeddingString.split(',').map(Number);

//         // Query Pinecone index with generated embeddings
//         const result = await index.query({
//             vector: embedding,
//             topK: 5,  // Increased from 3 to 5 for more context
//             includeMetadata: true,
//         });

//         // Prepare result string
//         let resultString = 'Retrieved professor information:\n';
//         result.matches.forEach((match, index) => {
//             resultString += `
//             Professor ${index + 1}: ${match.id}
//             Review: ${match.metadata.review.slice(0, 300)}...
//             Subject: ${match.metadata.subject}
//             Stars: ${match.metadata.stars}
//             `;
//         });

//         console.log("User query:", text);
//         console.log("Retrieved professor information:", resultString);

//         // Combine the system prompt, user query, and RAG results
//         const inputContent = `${systemPrompt}

//         User query: "${text}"

//         ${resultString}

//         Based on the above information, please provide a helpful and complete response to the user's query. If recommending professors, please format your response as follows:

//         Hello! Here are some recommended professors for database management:

//         Professor [Name]:
//         - [Key point about teaching style]
//         - [Student feedback]
//         - Course: "[Course Name]", Rating: [X.X] out of 5

//         [Repeat for each professor]

//         Is there anything else you'd like to know about these professors or their courses?`;

//         console.log("Input content for language model:", inputContent);

//         // Use GROQ for text generation with streaming
//         const completion = await groq.chat.completions.create({
//             messages: [
//                 {
//                     role: "system",
//                     content: systemPrompt,
//                 },
//                 {
//                     role: "user",
//                     content: inputContent,
//                 },
//             ],
//             model: "mixtral-8x7b-32768",
//             temperature: 0.7,
//             max_tokens: 500,  // Increased from 150 to 500
//             top_p: 0.9,
//             stream: true,  // Enable streaming
//         });

//         // Create a readable stream for the response
//         const stream = new ReadableStream({
//             async start(controller) {
//                 const encoder = new TextEncoder();
//                 for await (const chunk of completion) {
//                     const content = chunk.choices[0]?.delta?.content || '';
//                     controller.enqueue(encoder.encode(content));
//                 }
//                 controller.close();
//             },
//         });

//         return new NextResponse(stream);
//     } catch (error) {
//         console.error('Detailed error in POST request:', error);
//         if (error.error && error.error.message) {
//             console.error('API Error:', error.error.message);
//         }
//         return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
//     }
// }























































































