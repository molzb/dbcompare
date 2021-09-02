package com.ing.dbcompare.util;

import static java.lang.String.format;

import java.util.List;
import java.util.Map;

import com.google.gson.Gson;

public class Json {
	private Gson gson = new Gson();
	
	/** Creates JSON error message, e.g. {"error": "Sth went wrong!"} */
	public String toError(String error) {
		return format("{\"error\": \"%s\"}", gson.toJson(error.trim()));
	}

	public String toGson(List<Map<String, String>> rows) {
		return gson.toJson(rows);
	}

	/** Creates JSON array with an id and a string array, e.g. {"id":["x","y"]} */
	public String toJsonArray(String id, List<String> strs) {
		return format("{\"%s\":%s}", id, gson.toJson(strs));
	}

	/**
	 * Creates JSON array, e.g. {true, false, true}
	 */
	public String toJsonArray(List<Boolean> bools) {
		return new Gson().toJson(bools);
	}
}
