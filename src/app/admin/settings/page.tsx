"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Shield, Database } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your NepTube platform settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>
              Basic configuration for your platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input id="siteName" defaultValue="NepTube" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Input
                id="siteDescription"
                defaultValue="A video sharing platform"
              />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Content Moderation */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-600" />
              <CardTitle>Content Moderation</CardTitle>
            </div>
            <CardDescription>
              Configure how content is moderated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Video Approval</Label>
                <p className="text-sm text-gray-500">
                  New videos require admin approval before publishing
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-moderate Comments</Label>
                <p className="text-sm text-gray-500">
                  Automatically filter inappropriate comments
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Anonymous Comments</Label>
                <p className="text-sm text-gray-500">
                  Allow users without accounts to comment
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-600" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure admin notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>New User Notifications</Label>
                <p className="text-sm text-gray-500">
                  Get notified when new users sign up
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>New Video Notifications</Label>
                <p className="text-sm text-gray-500">
                  Get notified when videos are uploaded
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Report Notifications</Label>
                <p className="text-sm text-gray-500">
                  Get notified when content is reported
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-600" />
              <CardTitle>Database</CardTitle>
            </div>
            <CardDescription>
              Database connection and maintenance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Database Connected</span>
              </div>
              <span className="text-sm text-gray-600">Neon PostgreSQL</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Export Data</Button>
              <Button variant="outline">Backup Database</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
