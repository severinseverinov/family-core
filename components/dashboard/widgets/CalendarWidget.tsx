"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toast } from "@/components/ui/toast";
import { Plus, Lock, Users, Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import {
  getUpcomingEvents,
  getEventsByDate,
  createEvent,
  type Event,
} from "@/app/actions/events";
import { useRouter } from "next/navigation";

export function CalendarWidget() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateEvents, setDateEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [prefillDate, setPrefillDate] = useState<Date | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState<"family" | "private">("family");

  const fetchUpcomingEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUpcomingEvents();
      if (result.error) {
        setError(result.error);
        setUpcomingEvents([]);
      } else {
        setUpcomingEvents(result.events || []);
      }
    } catch (err) {
      setError("Failed to load events");
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDateEvents = async (date: Date) => {
    try {
      const result = await getEventsByDate(date.toISOString());
      if (result.error) {
        setDateEvents([]);
      } else {
        setDateEvents(result.events || []);
      }
    } catch (err) {
      setDateEvents([]);
    }
  };

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDateEvents(selectedDate);
    }
  }, [selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setPrefillDate(date);
      setDialogOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createEvent(formData);
      if (result.error) {
        setError(result.error);
        setToast({ message: result.error, type: "error" });
      } else {
        // Close dialog
        setDialogOpen(false);
        setError(null);
        setPrefillDate(null);
        
        // Reset form
        if (formRef.current) {
          formRef.current.reset();
        }
        
        // Show success toast
        setToast({ message: "Event created successfully!", type: "success" });
        
        // Refresh data
        router.refresh();
        await fetchUpcomingEvents();
        if (selectedDate) {
          await fetchDateEvents(selectedDate);
        }
      }
    } catch (err) {
      setError("Failed to create event");
      setToast({ message: "Failed to create event", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatEventTime = (dateString: string, isAllDay: boolean) => {
    const date = new Date(dateString);
    if (isAllDay) {
      return format(date, "MMM d");
    }
    return format(date, "MMM d, h:mm a");
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Calendar</CardTitle>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setPrefillDate(null);
              setError(null);
              setPrivacyLevel("family");
              if (formRef.current) {
                formRef.current.reset();
              }
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add Event</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Create a new event for your family calendar.
              </DialogDescription>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="title"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Title
                </label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Family Dinner"
                  required
                  disabled={submitting}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="start_time"
                    className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    Start
                  </label>
                  <Input
                    id="start_time"
                    name="start_time"
                    type="datetime-local"
                    required
                    disabled={submitting}
                    className="h-9"
                    defaultValue={
                      prefillDate
                        ? format(
                            new Date(
                              prefillDate.getFullYear(),
                              prefillDate.getMonth(),
                              prefillDate.getDate(),
                              new Date().getHours(),
                              new Date().getMinutes()
                            ),
                            "yyyy-MM-dd'T'HH:mm"
                          )
                        : undefined
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="end_time"
                    className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    End
                  </label>
                  <Input
                    id="end_time"
                    name="end_time"
                    type="datetime-local"
                    required
                    disabled={submitting}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_all_day"
                    name="is_all_day"
                    value="true"
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={submitting}
                  />
                  <label
                    htmlFor="is_all_day"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    All Day
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="privacy_level"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Privacy:
                  </label>
                  <div className="relative">
                    <Select
                      id="privacy_level"
                      name="privacy_level"
                      required
                      disabled={submitting}
                      className="h-9 w-32 pl-7"
                      value={privacyLevel}
                      onChange={(e) => setPrivacyLevel(e.target.value as "family" | "private")}
                    >
                      <option value="family">Family</option>
                      <option value="private">Private</option>
                    </Select>
                    <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                      {privacyLevel === "private" ? (
                        <Lock className="h-3.5 w-3.5 text-gray-500" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-2 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDialogOpen(false);
                    setPrefillDate(null);
                    setError(null);
                    setPrivacyLevel("family");
                    if (formRef.current) {
                      formRef.current.reset();
                    }
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left: Mini Calendar */}
          <div className="flex-shrink-0">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border border-gray-200 p-4 dark:border-gray-800"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem] dark:text-gray-400",
                row: "flex w-full mt-2",
                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-100 dark:[&:has([aria-selected])]:bg-gray-800 rounded-md focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md",
                day_selected: "bg-gray-900 text-gray-50 hover:bg-gray-900 hover:text-gray-50 focus:bg-gray-900 focus:text-gray-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50 dark:hover:text-gray-900 dark:focus:bg-gray-50 dark:focus:text-gray-900",
                day_today: "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
                day_outside: "text-gray-500 opacity-50 dark:text-gray-400",
                day_disabled: "text-gray-500 opacity-50 dark:text-gray-400",
                day_range_middle: "aria-selected:bg-gray-100 aria-selected:text-gray-900 dark:aria-selected:bg-gray-800 dark:aria-selected:text-gray-50",
                day_hidden: "invisible",
              }}
            />
          </div>

          {/* Right: Events List */}
          <div className="flex-1 space-y-4">
            {selectedDate && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {format(selectedDate, "EEEE, MMMM d")}
                </h3>
                {dateEvents.length > 0 && (
                  <div className="mt-2 max-h-32 space-y-2 overflow-y-auto">
                    {dateEvents.map(event => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                      >
                        {event.privacy_level === "private" ? (
                          <Lock className="h-3 w-3 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <Users className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        )}
                        <span className="flex-1 font-medium text-gray-900 dark:text-gray-50">
                          {event.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatEventTime(event.start_time, event.is_all_day)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-50">
                Upcoming Events
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-sm text-gray-500">Loading events...</div>
                </div>
              ) : error && upcomingEvents.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-sm text-red-500">{error}</div>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-2 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No upcoming events</p>
                  <p className="text-xs text-gray-400">
                    Add your first event to get started
                  </p>
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {upcomingEvents.map(event => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 rounded-md border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                    >
                      {event.privacy_level === "private" ? (
                        <Lock className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <Users className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatEventTime(event.start_time, event.is_all_day)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

