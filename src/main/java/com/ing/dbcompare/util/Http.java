package com.ing.dbcompare.util;

import static java.net.HttpURLConnection.HTTP_NOT_FOUND;
import static java.net.HttpURLConnection.HTTP_OK;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import com.sun.net.httpserver.HttpExchange;

public class Http {
    private static List<String> cachedFilePattern = Arrays.asList(new String[] { "woff2" });

    private static Map<String, String> contentTypes = //
            Map.of("html", "text/html; charset=utf-8", "js", "application/javascript; charset=utf-8", "json",
                    "application/json; charset=utf-8", "css", "text/css", "png", "image/png");

    public static void response(HttpExchange t, int statusCode, String content) throws IOException {
        response(t, statusCode, content.getBytes());
    }

    public static void response(HttpExchange t, int statusCode, byte[] content) throws IOException {
        String path = t.getRequestURI().getPath();
        String suffix = path.substring(path.lastIndexOf('.') + 1);
        addCacheControlHeader(t, path);
        t.getResponseHeaders().add("Content-Type", Http.getContentTypeFor(suffix));
        t.sendResponseHeaders(statusCode, content.length);

        // if (path.contains("packed")) { // GZIP compression
        //     t.getResponseHeaders().add("Content-Encoding", "gzip");
        //     try (OutputStream os = new GZIPOutputStream(t.getResponseBody())) {
        //         os.write(content);
        //     }
        // } else { // no compression
            try (OutputStream os = t.getResponseBody()) {
                os.write(content);
            // }
        }
    }

    private static void addCacheControlHeader(HttpExchange t, String path) {
        for (String ptn : cachedFilePattern) {
            if (path.contains(ptn)) {
                t.getResponseHeaders().add("Cache-Control", "max-age=31536000");
            }
        }
    }

    private static String getContentTypeFor(String suffix) {
        String contentType = contentTypes.get(suffix);
        return contentType == null ? "text/plain; charset=utf-8" : contentType;
    }

    public static void serveFile(HttpExchange t) throws IOException {
        String path = t.getRequestURI().getPath(); // e.g. /db/select.json...
        String file = path.substring(3); // remove '/db' from URL
        try (InputStream is = Http.class.getResourceAsStream(file)) {
            if (is == null) {
                Http.response(t, HTTP_NOT_FOUND, "File not found: " + t.getRequestURI());
            } else {
                Http.response(t, HTTP_OK, is.readAllBytes());
            }
        }
    }
}
