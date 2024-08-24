import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { HfInference } from '@huggingface/inference';

const systemPrompt = `You are an AI assistant specialized in helping students find suitable professors based on their queries. Your knowledge comes from a database of professor reviews and ratings, which you access using a RAG (Retrieval-Augmented Generation) system.

For each user query, you will be provided with information about the top 3 most relevant professors based on the RAG search. Your task is to analyze this information and present it to the student in a helpful, concise, and informative manner.

When responding:
1. Always provide information about all 3 professors, even if some seem less relevant.
2. Summarize key points from the reviews, including teaching style, course difficulty, and any standout positive or negative comments.
3. Mention the professor's name, subject area, and overall rating (in stars) if available.
4. If the query is about a specific subject or teaching style, highlight how each professor matches or differs from the request.
5. Be objective and balanced. Present both positive and negative aspects from the reviews.
6. Don't invent or assume information not present in the provided data.
7. If the query doesn't seem to match the retrieved professors well, acknowledge this and explain why the results might be relevant.
8. Conclude with a brief comparison of the three professors, highlighting their main differences or similarities.
9. If appropriate, suggest what additional information the student might want to consider when making their decision.

Remember, your goal is to help students make informed decisions about their professors based on the experiences of other students. Be helpful, but encourage students to use this information as just one factor in their decision-making process.`;

export async function POST(req) {
    try {
        const data = await req.json();
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        const index = pc.index('rag');
        const inference = new HfInference(process.env.HUGGINGFACE_API_KEY);

        // Extract the user's query
        const text = data[data.length - 1].content;
        
        // Generate embeddings using Hugging Face model
        const embedding = await inference.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: text,
        });

        // Query Pinecone index with generated embeddings
        const result = await index.query({
            vector: embedding,
            topK: 3,
            includeMetadata: true,
            namespace: 'ns1'
        });

        let resultString = '\n\nReturned result from vectordb (done automatically):';
        result.matches.forEach((match) => {
            resultString += `\n
            Professor: ${match.id}
            Review: ${match.metadata.review}
            Subject: ${match.metadata.subject}
            Stars: ${match.metadata.stars}
            \n\n`;
        });

        // Combine the retrieved results with the last user message
        const lastMessage = data[data.length - 1];  // Get the last message from the user
        const lastMessageContent = lastMessage.content + resultString;  // Append the retrieved results to the user's message

        // Prepare the conversation history without the last user message
        const lastDataWithoutLastMessage = data.slice(0, data.length - 1);  

        // Combine the system prompt, the conversation history, and the modified last message content
        const inputContent = `${systemPrompt}\n\n${lastDataWithoutLastMessage.map(message => message.role + ': ' + message.content).join('\n')}\nUser: ${lastMessageContent}`;

        // Use the inputContent in the text generation request
        const response = await inference.textGeneration({
            model: 'bigscience/bloom-560m',
            inputs: inputContent,  // Use the combined content as input
            parameters: {
                max_length: 500, // Adjust the max length as needed
                temperature: 0.7, // Adjust temperature for randomness
            },
        });

        // Create a readable stream for the response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    const content = response.generated_text;
                    if (content) {
                        const text = encoder.encode(content);
                        controller.enqueue(text);
                    }
                } catch (err) {
                    controller.error(err);
                } finally {
                    controller.close();
                }
            },
        });

        return new NextResponse(stream);
    } catch (error) {
        console.error('Error in POST request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}