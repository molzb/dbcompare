package com.ing.dbcompare;

import static java.nio.file.StandardOpenOption.APPEND;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Arrays;

public class PackFiles {
    public static void concatFiles() throws IOException {
        File dirWithCss = new File("src/main/resources/css");
        File dirWithJs = new File("src/main/resources/js");
        File[] cssFiles = dirWithCss.listFiles((dir, name) -> name.endsWith(".css"));
        File[] jsFiles = dirWithJs.listFiles((dir, name) -> name.endsWith(".js"));
        File packedCss = new File("src/main/resources/packed.css");
        File packedJs = new File("src/main/resources/packed.js");
        new FileWriter(packedCss).close(); // create empty file
        new FileWriter(packedJs).close();
        Arrays.asList(cssFiles).stream().forEach(f -> appendFile(f, packedCss));
        Arrays.asList(jsFiles).stream().forEach(f -> appendFile(f, packedJs));
    }

    private static void appendFile(File source, File dest) {
        try {
            FileInputStream fis = new FileInputStream(source);
            Files.write(dest.toPath(), fis.readAllBytes(), APPEND);
            fis.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}