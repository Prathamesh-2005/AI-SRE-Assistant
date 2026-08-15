package com.Jadhav.Backend.Controller;

import com.Jadhav.Backend.Config.DatabaseDiagnosticTools;
import com.Jadhav.Backend.Config.KnowledgeRetrievalTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
public class AgentController {

    private final ChatClient chatClient;

    public AgentController(
            ChatClient.Builder chatClientBuilder,
            DatabaseDiagnosticTools databaseDiagnosticTools,
            KnowledgeRetrievalTools knowledgeRetrievalTools) {

        ToolCallback[] dbTools = ToolCallbacks.from(databaseDiagnosticTools);
        ToolCallback[] ragTools = ToolCallbacks.from(knowledgeRetrievalTools);

        List<ToolCallback> allToolsList = new ArrayList<>();
        allToolsList.addAll(List.of(dbTools));
        allToolsList.addAll(List.of(ragTools));
        ToolCallback[] allTools = allToolsList.toArray(new ToolCallback[0]);

        this.chatClient = chatClientBuilder
                .defaultSystem("""
                        You are a MySQL database SRE agent.

                        CRITICAL TOOL CALLING RULES:
                        1. You must call ONLY ONE tool at a time. NEVER attempt to call multiple tools at once.
                        2. Do NOT output any conversational text, explanations, or thinking before calling a tool. If you need data, output ONLY the tool call.
                        
                        WORKFLOW:
                        - First, call checkRunningQueries.
                        - Second, call checkDatabaseLocks.
                        - Third, if you find an anomaly, call searchTroubleshootingPlaybook.
                        - Finally, once you have all the data, output your final resolution report.
                        """)
                .defaultTools(allTools)
                .build();
    }

    @GetMapping("/api/investigate")
    public String investigate(@RequestParam String prompt) {
        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }
}