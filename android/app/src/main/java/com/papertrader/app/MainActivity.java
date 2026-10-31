package com.papertrader.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;

/**
 * Paper Trader — WebView shell with a swappable server.
 * Default: GitHub Pages (static game, per-device saves). Point it at
 * any Paper Trader server (Render/Docker/own box) from the menu and
 * the shared file cabinet, press badges, wire & leaderboard light up.
 * No rebuild needed when the host changes.
 */
public class MainActivity extends Activity {
    private static final String PREFS = "papertrader";
    private static final String KEY_URL = "server_url";

    private WebView web;

    private String serverUrl() {
        SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
        return p.getString(KEY_URL, getString(R.string.game_url));
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setLoadWithOverviewMode(true);
        ws.setUseWideViewPort(true);
        ws.setTextZoom(100);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                web.setBackgroundColor(0xFF7C4F28);
            }
        });

        web.loadUrl(serverUrl());
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        menu.add("server address");
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        final EditText in = new EditText(this);
        in.setText(serverUrl());
        in.setHint("https://…");
        new AlertDialog.Builder(this)
                .setTitle("Paper Trader server")
                .setMessage("Paste the address of a Paper Trader server (with the file cabinet, badges & leaderboard). Leave the default for single-device play.")
                .setView(in)
                .setPositiveButton("save & load", (d, w) -> {
                    String u = in.getText().toString().trim();
                    if (u.isEmpty()) return;
                    if (!u.startsWith("http")) u = "https://" + u;
                    getSharedPreferences(PREFS, MODE_PRIVATE)
                            .edit().putString(KEY_URL, u).apply();
                    web.loadUrl(u);
                })
                .setNegativeButton("cancel", null)
                .show();
        return true;
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
