package com.olima.execution;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebSearchService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${search.tavily.api-key:}")
    private String tavilyApiKey;

    @Value("${search.serpapi.api-key:}")
    private String serpApiKey;

    @Value("${search.google.api-key:}")
    private String googleApiKey;

    @Value("${search.google.cx:}")
    private String googleCx;

    public record SearchResult(String title, String snippet, String url) {}

    public List<SearchResult> search(String query) {
        List<SearchResult> results = new ArrayList<>();
        if (query == null || query.isBlank()) {
            return results;
        }

        if (googleApiKey != null && !googleApiKey.isBlank() && googleCx != null && !googleCx.isBlank()) {
            results = searchGoogle(query);
            if (!results.isEmpty()) {
                return results;
            }
        }

        if (tavilyApiKey != null && !tavilyApiKey.isBlank()) {
            results = searchTavily(query);
            if (!results.isEmpty()) {
                return results;
            }
        }

        if (serpApiKey != null && !serpApiKey.isBlank()) {
            results = searchSerpApi(query);
            if (!results.isEmpty()) {
                return results;
            }
        }

        results = searchDuckDuckGoHtml(query);
        if (!results.isEmpty()) {
            return results;
        }

        results = searchWikipedia(query);
        return results;
    }

    private List<SearchResult> searchTavily(String query) {
        List<SearchResult> results = new ArrayList<>();
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("api_key", tavilyApiKey);
            body.put("query", query);
            body.put("search_depth", "advanced");
            body.put("include_answer", false);
            body.put("max_results", 8);

            String response = restClient.post()
                    .uri("https://api.tavily.com/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            if (response != null && !response.isBlank()) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode items = root.path("results");
                if (items.isArray()) {
                    for (JsonNode item : items) {
                        String title = item.path("title").asText();
                        String content = item.path("content").asText();
                        String url = item.path("url").asText();
                        results.add(new SearchResult(title, content, url));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Tavily search failed: {}", e.getMessage());
        }
        return results;
    }

    private List<SearchResult> searchSerpApi(String query) {
        List<SearchResult> results = new ArrayList<>();
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://serpapi.com/search.json?engine=google&q=" + encoded
                    + "&api_key=" + serpApiKey + "&hl=uz&gl=uz";

            String response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            if (response != null && !response.isBlank()) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode organic = root.path("organic_results");
                if (organic.isArray()) {
                    for (JsonNode item : organic) {
                        String title = item.path("title").asText();
                        String snippet = item.path("snippet").asText();
                        String link = item.path("link").asText();
                        results.add(new SearchResult(title, snippet, link));
                        if (results.size() >= 5) break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("SerpAPI search failed: {}", e.getMessage());
        }
        return results;
    }

    private List<SearchResult> searchGoogle(String query) {
        List<SearchResult> results = new ArrayList<>();
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://www.googleapis.com/customsearch/v1?q=" + encoded
                    + "&key=" + googleApiKey + "&cx=" + googleCx;

            String response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            if (response != null && !response.isBlank()) {
                JsonNode root = objectMapper.readTree(response);
                JsonNode items = root.path("items");
                if (items.isArray()) {
                    for (JsonNode item : items) {
                        String title = item.path("title").asText();
                        String snippet = item.path("snippet").asText();
                        String link = item.path("link").asText();
                        results.add(new SearchResult(title, snippet, link));
                        if (results.size() >= 5) break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Google search failed: {}", e.getMessage());
        }
        return results;
    }

    private List<SearchResult> searchDuckDuckGoHtml(String query) {
        List<SearchResult> results = new ArrayList<>();
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://html.duckduckgo.com/html/?q=" + encoded;

            String html = restClient.get()
                    .uri(url)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "uz,ru,en;q=0.9")
                    .retrieve()
                    .body(String.class);

            if (html == null || html.isBlank()) {
                return results;
            }

            Pattern titlePattern = Pattern.compile(
                    "<h2[^>]+class=\"result__title\"[^>]*>\\s*<a[^>]*>(.*?)</a>",
                    Pattern.CASE_INSENSITIVE | Pattern.DOTALL
            );
            Matcher titleMatcher = titlePattern.matcher(html);
            List<String> titles = new ArrayList<>();
            while (titleMatcher.find()) {
                titles.add(cleanHtml(titleMatcher.group(1)));
            }

            Pattern snippetPattern = Pattern.compile(
                    "<a[^>]+class=\"result__snippet\"[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>",
                    Pattern.CASE_INSENSITIVE | Pattern.DOTALL
            );
            Matcher snippetMatcher = snippetPattern.matcher(html);

            int idx = 0;
            while (snippetMatcher.find() && results.size() < 5) {
                String rawHref = snippetMatcher.group(1);
                String snippet = cleanHtml(snippetMatcher.group(2));
                String targetUrl = extractTargetUrl(rawHref);
                String title = idx < titles.size() ? titles.get(idx) : "Web Result";
                idx++;

                if (!snippet.isBlank()) {
                    results.add(new SearchResult(title, snippet, targetUrl));
                }
            }
        } catch (Exception e) {
            log.warn("DuckDuckGo HTML search warning: {}", e.getMessage());
        }
        return results;
    }

    private List<SearchResult> searchWikipedia(String query) {
        List<SearchResult> results = new ArrayList<>();
        try {
            String wikiLang = containsUzbekKeywords(query) ? "uz" : "en";
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String wikiUrl = "https://" + wikiLang + ".wikipedia.org/w/api.php?action=query&list=search&srsearch="
                    + encoded + "&format=json&utf8=1";

            String wikiJson = restClient.get().uri(wikiUrl).retrieve().body(String.class);
            if (wikiJson != null && !wikiJson.isBlank()) {
                JsonNode root = objectMapper.readTree(wikiJson);
                JsonNode searchNodes = root.path("query").path("search");
                if (searchNodes.isArray()) {
                    for (JsonNode sn : searchNodes) {
                        String title = sn.path("title").asText();
                        String snippet = cleanHtml(sn.path("snippet").asText());
                        String url = "https://" + wikiLang + ".wikipedia.org/wiki/"
                                + URLEncoder.encode(title.replace(' ', '_'), StandardCharsets.UTF_8);
                        results.add(new SearchResult(title, snippet, url));
                        if (results.size() >= 5) break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Wikipedia search warning: {}", e.getMessage());
        }
        return results;
    }

    private String extractTargetUrl(String rawHref) {
        try {
            if (rawHref.contains("uddg=")) {
                String sub = rawHref.substring(rawHref.indexOf("uddg=") + 5);
                int ampIdx = sub.indexOf('&');
                if (ampIdx != -1) {
                    sub = sub.substring(0, ampIdx);
                }
                return URLDecoder.decode(sub, StandardCharsets.UTF_8);
            }
            if (rawHref.startsWith("//")) {
                return "https:" + rawHref;
            }
            return rawHref;
        } catch (Exception e) {
            return rawHref;
        }
    }

    private String cleanHtml(String text) {
        if (text == null) return "";
        return text.replaceAll("<[^>]*>", "")
                .replace("&quot;", "\"")
                .replace("&#x27;", "'")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&nbsp;", " ")
                .trim();
    }

    private boolean containsUzbekKeywords(String s) {
        String lower = s.toLowerCase();
        return lower.contains("o'") || lower.contains("g'") || lower.contains("qachon")
                || lower.contains("nima") || lower.contains("qanday") || lower.contains("haqida")
                || lower.contains("universitet") || lower.contains("vazirlik");
    }

    public String fetchPage(String url) {
        if (url == null || url.isBlank() || !url.startsWith("http")) {
            return "Invalid URL";
        }
        try {
            String html = restClient.get()
                    .uri(url)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .retrieve()
                    .body(String.class);

            if (html == null || html.isBlank()) {
                return "Empty page response";
            }

            // Remove noise tags
            String text = html.replaceAll("(?is)<script.*?</script>", " ")
                    .replaceAll("(?is)<style.*?</style>", " ")
                    .replaceAll("(?is)<svg.*?</svg>", " ")
                    .replaceAll("(?is)<header.*?</header>", " ")
                    .replaceAll("(?is)<footer.*?</footer>", " ")
                    .replaceAll("(?is)<nav.*?</nav>", " ")
                    // Preserve table structure
                    .replaceAll("(?i)<tr[^>]*>", "\n")
                    .replaceAll("(?i)<td[^>]*>", " | ")
                    .replaceAll("(?i)<th[^>]*>", " | ")
                    .replaceAll("(?i)</tr>", " |")
                    .replaceAll("(?i)</th>", " |")
                    .replaceAll("(?i)</td>", " |")
                    .replaceAll("(?i)<br\\s*/?>", "\n")
                    .replaceAll("(?i)</p>", "\n\n")
                    .replaceAll("<[^>]*>", " ")
                    .replace("&quot;", "\"")
                    .replace("&#x27;", "'")
                    .replace("&amp;", "&")
                    .replace("&lt;", "<")
                    .replace("&gt;", ">")
                    .replace("&nbsp;", " ")
                    .replaceAll("[ \t]+", " ")
                    .replaceAll("\n{3,}", "\n\n")
                    .trim();

            if (text.length() > 6000) {
                return text.substring(0, 6000) + "\n... [Content truncated]";
            }
            return text;
        } catch (Exception e) {
            log.warn("Failed to fetch web page {}: {}", url, e.getMessage());
            return "Could not fetch webpage content: " + e.getMessage();
        }
    }
}
