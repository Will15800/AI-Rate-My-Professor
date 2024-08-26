import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const systemPrompt = `
You are an AI assistant specialized in helping students find suitable professors based on their queries. Your knowledge comes from a database of professor reviews and ratings. Respond directly to the user's query using the provided information about professors. If the query is a greeting or not directly related to professor information, respond politely and ask how you can assist with finding professor information.
`;

export async function POST(req) {
    try {
        const data = await req.json();
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        const index = pc.index('rag');

        // Extract the user's query
        const text = data[data.length - 1].content;
        
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
                    content: text
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
            topK: 5,  // Increased from 3 to 5 for more context
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

        console.log("User query:", text);
        console.log("Retrieved professor information:", resultString);

        // Combine the system prompt, user query, and RAG results
        const inputContent = `${systemPrompt}

        User query: "${text}"

        ${resultString}

        Based on the above information, please provide a helpful and complete response to the user's query. If recommending professors, please format your response as follows:

        Hello! Here are some recommended professors for database management:

        Professor [Name]:
        - [Key point about teaching style]
        - [Student feedback]
        - Course: "[Course Name]", Rating: [X.X] out of 5

        [Repeat for each professor]

        Is there anything else you'd like to know about these professors or their courses?`;

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
            max_tokens: 500,  // Increased from 150 to 500
            top_p: 0.9,
            stream: true,  // Enable streaming
        });

        // Create a readable stream for the response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    controller.enqueue(encoder.encode(content));
                }
                controller.close();
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
