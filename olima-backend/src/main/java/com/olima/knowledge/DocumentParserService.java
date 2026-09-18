package com.olima.knowledge;

import com.olima.knowledge.exception.DocumentParseException;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.HttpHeaders;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.stereotype.Service;
import org.xml.sax.SAXException;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.URL;
import java.net.HttpURLConnection;
import java.net.UnknownHostException;

/**
 * Extracts plain text from uploaded files (PDF, DOCX, DOC, TXT, HTML, RTF, ...) and from
 * live web pages, using Apache Tika's format auto-detection, so callers don't need to
 * branch on file type.
 */
@Slf4j
@Service
public class DocumentParserService {

    private static final int NO_WRITE_LIMIT = -1;
    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final int READ_TIMEOUT_MS = 20_000;
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

    public String extractText(InputStream inputStream, String fileName) {
        Metadata metadata = new Metadata();
        if (fileName != null) {
            metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, fileName);
        }
        return parse(inputStream, metadata, fileName);
    }

    /**
     * Fetches a web page and extracts its readable text via Tika's HTML parser
     * (handles boilerplate/tag stripping consistently with the other document types).
     */
    public String extractTextFromUrl(String url) {
        validateUrl(url);
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("GET");
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setRequestProperty("User-Agent", USER_AGENT);
            connection.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

            int status = connection.getResponseCode();
            if (status >= 400) {
                throw new DocumentParseException("Web page returned HTTP " + status + ": " + url, null);
            }

            Metadata metadata = new Metadata();
            metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, url);
            String contentType = connection.getContentType();
            if (contentType != null) {
                metadata.set(HttpHeaders.CONTENT_TYPE, contentType);
            }

            try (InputStream inputStream = connection.getInputStream()) {
                return parse(inputStream, metadata, url);
            }
        } catch (DocumentParseException e) {
            throw e;
        } catch (IOException e) {
            log.warn("Failed to fetch web page {}: {}", url, e.getMessage());
            throw new DocumentParseException("Could not fetch web page: " + url, e);
        }
    }

    private String parse(InputStream inputStream, Metadata metadata, String source) {
        try {
            AutoDetectParser parser = new AutoDetectParser();
            BodyContentHandler handler = new BodyContentHandler(NO_WRITE_LIMIT);
            parser.parse(inputStream, handler, metadata, new ParseContext());
            String text = handler.toString().trim();
            if (text.isEmpty()) {
                throw new DocumentParseException("No extractable text found in: " + source, null);
            }
            return text;
        } catch (IOException | SAXException | TikaException e) {
            log.warn("Failed to parse {}: {}", source, e.getMessage());
            throw new DocumentParseException("Could not parse: " + source, e);
        }
    }

    private void validateUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL is required");
        }
        URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid URL: " + url);
        }
        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("Only http/https URLs are supported");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Invalid URL: missing host");
        }
        if (isPrivateOrLoopback(host)) {
            throw new IllegalArgumentException("Fetching internal/private network addresses is not allowed");
        }
    }

    private boolean isPrivateOrLoopback(String host) {
        String lowerHost = host.toLowerCase();
        if (lowerHost.equals("localhost") || lowerHost.endsWith(".localhost")) {
            return true;
        }
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress address : addresses) {
                if (address.isLoopbackAddress() || address.isAnyLocalAddress()
                        || address.isLinkLocalAddress() || address.isSiteLocalAddress()) {
                    return true;
                }
            }
            return false;
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("Could not resolve host: " + host);
        }
    }
}
